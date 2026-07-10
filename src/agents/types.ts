import type { ZodType } from "zod";
import type { ReferenceInput } from "@/types";

export type { ReferenceInput };

/**
 * Agent contracts (T-021). This module has ZERO Next.js imports so the pipeline
 * can be unit-tested / run against a test-idea suite (T-062) without the web
 * app. The Mesh client is injected as `MeshDeps` rather than imported, so the
 * agents module never pulls in the server-only `lib/mesh`.
 */

export type AgentName =
  | "research"
  | "draft"
  | "refine"
  | "technical"
  | "security"
  | "ui_ux"
  | "tickets";

/** A document produced earlier in the run, provided as context. */
export interface PriorDoc {
  type: string;
  content: string;
}

/** Everything an agent needs to do its job: the idea + all prior docs. */
export interface AgentContext {
  idea: string;
  ideaMeta?: Record<string, string>;
  priorDocs: PriorDoc[];
  references?: ReferenceInput[];
  notes?: string;
}

export interface AgentUsage {
  input_tokens: number;
  output_tokens: number;
}

/** Normalized LLM result (mirrors lib/mesh's MeshResult, kept local). */
export interface LlmResult<T = string> {
  content: T;
  usage: AgentUsage;
  model: string;
  latency_ms: number;
}

export interface LlmCallOptions {
  model: string;
  system?: string;
  prompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  webSearch?: boolean;
}

/**
 * The Mesh capabilities the runner needs, injected by the caller. `lib/mesh`'s
 * exports satisfy this shape structurally; a test can pass a stub.
 */
export interface MeshDeps {
  generate(o: LlmCallOptions): Promise<LlmResult<string>>;
  generateStructured<T>(
    o: LlmCallOptions,
    schema: ZodType<T>,
  ): Promise<LlmResult<T>>;
  generateWithSearch(o: LlmCallOptions): Promise<LlmResult<string>>;
  vectorSearch?(p: {
    query: string;
    fileIds: string[];
    topK?: number;
  }): Promise<Array<{ text: string; source?: string }>>;
}

/** What every agent returns — Markdown content + usage for cost tracking. */
export interface AgentResult {
  content: string;
  usage: AgentUsage;
  model: string;
  latency_ms: number;
}

/** Optional tracing hook (Langfuse in T-062); no-op by default. */
export interface AgentTracer {
  (event: {
    agent: AgentName;
    model: string;
    usage: AgentUsage;
    latency_ms: number;
  }): void;
}
