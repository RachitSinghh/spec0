import "server-only";
import {
  createOpenAICompatible,
  type OpenAICompatibleProvider,
} from "@ai-sdk/openai-compatible";
import { generateText, generateObject, type ModelMessage } from "ai";
import type { z } from "zod";

import { env } from "@/lib/env";

/**
 * Mesh LLM gateway client (T-020, TECHNICAL-ARCHITECTURE §2.2, FRONTEND-SPEC B3).
 *
 * Mesh is an OpenAI-compatible endpoint, so we point the AI SDK's
 * openai-compatible provider at MESH_BASE_URL with MESH_API_KEY as the bearer.
 * BACKEND ONLY — this module is `server-only`; the browser never holds a Mesh
 * key or calls Mesh directly.
 *
 * Every helper returns a normalized shape so callers (the agents module) can
 * mirror usage into pipeline_steps for cost tracking.
 */

export interface MeshUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface MeshResult<T = string> {
  content: T;
  usage: MeshUsage;
  model: string;
  latency_ms: number;
}

export interface MeshGenerateOptions {
  model: string;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  /** Enable Mesh web search for this call (e.g. the Research agent). */
  webSearch?: boolean;
}

/**
 * Provider override (temporary): set LLM_BASE_URL + LLM_API_KEY (+ LLM_MODEL
 * in agents/config) to route all calls to any OpenAI-compatible endpoint
 * (HF router, Google Gemini, etc.) instead of Mesh. Web search + RAG are
 * Mesh-only and are disabled under an override.
 * NOTE: the hackathon requires Mesh — remove the override before demo.
 */
const ALT_BASE_URL = process.env.LLM_BASE_URL?.trim();
const BASE_URL = ALT_BASE_URL || env.MESH_BASE_URL;
const API_KEY = ALT_BASE_URL ? process.env.LLM_API_KEY ?? "" : env.MESH_API_KEY;

// Base provider — plain OpenAI-compatible calls. supportsStructuredOutputs
// sends the JSON schema natively via response_format (verified working on
// both Mesh and the HF router) instead of prompt-injecting it.
const mesh: OpenAICompatibleProvider = createOpenAICompatible({
  name: "mesh",
  baseURL: BASE_URL,
  apiKey: API_KEY,
  supportsStructuredOutputs: true,
});

/**
 * A second provider whose fetch injects Mesh's web-search flag into the request
 * body. The exact field name is a Mesh detail — VERIFY against the Mesh docs
 * and adjust `WEB_SEARCH_BODY` if needed.
 */
const WEB_SEARCH_BODY = { web_search: true } as const;
const meshSearch: OpenAICompatibleProvider = createOpenAICompatible({
  name: "mesh-search",
  baseURL: BASE_URL,
  apiKey: API_KEY,
  supportsStructuredOutputs: true,
  fetch: async (input, init) => {
    if (init?.body && typeof init.body === "string") {
      try {
        const parsed = JSON.parse(init.body);
        init = { ...init, body: JSON.stringify({ ...parsed, ...WEB_SEARCH_BODY }) };
      } catch {
        // leave body untouched if it isn't JSON
      }
    }
    return fetch(input, init);
  },
});

function normalizeUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
}): MeshUsage {
  return {
    input_tokens: usage.inputTokens ?? usage.promptTokens ?? 0,
    output_tokens: usage.outputTokens ?? usage.completionTokens ?? 0,
  };
}

// The AI SDK prompt is a strict union: `{ messages }` XOR `{ prompt }`.
type PromptArgs =
  | { system?: string; messages: ModelMessage[] }
  | { system?: string; prompt: string };

function promptArgs(opts: MeshGenerateOptions): PromptArgs {
  return opts.messages
    ? { system: opts.system, messages: opts.messages }
    : { system: opts.system, prompt: opts.prompt ?? "" };
}

async function runText(
  opts: MeshGenerateOptions,
): Promise<MeshResult<string>> {
  // Web search is a Mesh feature — never send its body param elsewhere.
  const provider = opts.webSearch && !ALT_BASE_URL ? meshSearch : mesh;
  const start = Date.now();
  const common = {
    model: provider(opts.model),
    temperature: opts.temperature,
    maxOutputTokens: opts.maxOutputTokens,
  };
  const args = promptArgs(opts);
  const res =
    "messages" in args
      ? await generateText({ ...common, system: args.system, messages: args.messages })
      : await generateText({ ...common, system: args.system, prompt: args.prompt });
  return {
    content: res.text,
    usage: normalizeUsage(res.usage),
    model: opts.model,
    latency_ms: Date.now() - start,
  };
}

/** Plain text generation. */
export async function generate(
  opts: MeshGenerateOptions,
): Promise<MeshResult<string>> {
  return runText(opts);
}

/**
 * Structured output validated against a Zod schema. The AI SDK sends a JSON
 * schema via response_format and retries on schema mismatch.
 */
export async function generateStructured<T>(
  opts: MeshGenerateOptions,
  schema: z.ZodType<T>,
): Promise<MeshResult<T>> {
  const provider = opts.webSearch && !ALT_BASE_URL ? meshSearch : mesh;
  const start = Date.now();
  const common = {
    model: provider(opts.model),
    schema,
    temperature: opts.temperature,
    maxOutputTokens: opts.maxOutputTokens,
    maxRetries: 2,
  };
  const args = promptArgs(opts);
  const res =
    "messages" in args
      ? await generateObject({ ...common, system: args.system, messages: args.messages })
      : await generateObject({ ...common, system: args.system, prompt: args.prompt });
  return {
    content: res.object,
    usage: normalizeUsage(res.usage),
    model: opts.model,
    latency_ms: Date.now() - start,
  };
}

/** Text generation with Mesh web search enabled (the Research agent). */
export async function generateWithSearch(
  opts: MeshGenerateOptions,
): Promise<MeshResult<string>> {
  return runText({ ...opts, webSearch: true });
}

// ─── RAG helpers (Mesh files) ───────────────────────────────────────────────
// Mesh RAG flow: Init Upload → Trigger Embedding → Vector Search. Exact REST
// shapes are Mesh-specific — VERIFY against the Mesh docs. Kept minimal and
// clearly isolated so the UI/UX agent can ground on uploaded references.

function meshHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${env.MESH_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Register a reference file with Mesh RAG and trigger embedding. */
export async function uploadReference(params: {
  url: string;
  filename: string;
}): Promise<{ fileId: string }> {
  const res = await fetch(`${env.MESH_BASE_URL}/files`, {
    method: "POST",
    headers: meshHeaders(),
    body: JSON.stringify({ url: params.url, filename: params.filename }),
  });
  if (!res.ok) throw new Error(`Mesh upload failed: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return { fileId: data.id };
}

/** Vector-search uploaded references for grounded, cited snippets. */
export async function vectorSearch(params: {
  query: string;
  fileIds: string[];
  topK?: number;
}): Promise<Array<{ text: string; source?: string }>> {
  const res = await fetch(`${env.MESH_BASE_URL}/vector_search`, {
    method: "POST",
    headers: meshHeaders(),
    body: JSON.stringify({
      query: params.query,
      file_ids: params.fileIds,
      top_k: params.topK ?? 5,
    }),
  });
  if (!res.ok) throw new Error(`Mesh vector search failed: ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{ text: string; source?: string }>;
  };
  return data.results ?? [];
}
