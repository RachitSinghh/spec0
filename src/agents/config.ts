import type { AgentName } from "@/agents/types";

/**
 * Per-agent configuration (T-021). Model IDs come from env with the defaults
 * from TECHNICAL-ARCHITECTURE §6. Read from process.env directly (NOT the
 * server-only lib/env) so the agents module stays standalone-runnable.
 *
 * Refine (the quality gate) gets the strongest model; research enables web
 * search + structured output; ui_ux uses RAG over uploaded references; tickets
 * uses structured output.
 */

type OutputMode = "text" | "structured";

export interface AgentConfig {
  model: string;
  mode: OutputMode;
  webSearch: boolean;
  useRag: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

function model(name: string, fallback: string): string {
  // Temporary provider override: one model for every agent (see lib/mesh.ts).
  // Must support response_format json_schema on the target endpoint.
  if (process.env.LLM_BASE_URL?.trim()) {
    return process.env.LLM_MODEL?.trim() || "gemini-2.5-flash";
  }
  return process.env[name]?.trim() || fallback;
}

const MODEL_RESEARCH = () => model("MODEL_RESEARCH", "anthropic/claude-sonnet-5");
const MODEL_DRAFTING = () => model("MODEL_DRAFTING", "anthropic/claude-sonnet-5");
const MODEL_REFINE = () => model("MODEL_REFINE", "anthropic/claude-opus-4.8");
const MODEL_ADDONS = () => model("MODEL_ADDONS", "anthropic/claude-sonnet-5");

const webSearchEnabled = () =>
  (process.env.MESH_ENABLE_WEB_SEARCH ?? "true") !== "false";

export function getAgentConfig(agent: AgentName): AgentConfig {
  switch (agent) {
    case "research":
      return {
        model: MODEL_RESEARCH(),
        mode: "structured",
        webSearch: webSearchEnabled(),
        useRag: false,
        temperature: 0.4,
      };
    case "draft":
      return {
        model: MODEL_DRAFTING(),
        mode: "text",
        webSearch: false,
        useRag: false,
        temperature: 0.6,
      };
    case "refine":
      // Quality gate → strongest model, low temperature.
      return {
        model: MODEL_REFINE(),
        mode: "text",
        webSearch: false,
        useRag: false,
        temperature: 0.3,
      };
    case "technical":
    case "security":
      return {
        model: MODEL_ADDONS(),
        mode: "text",
        webSearch: false,
        useRag: false,
        temperature: 0.5,
      };
    case "ui_ux":
      return {
        model: MODEL_ADDONS(),
        mode: "text",
        webSearch: false,
        useRag: true,
        temperature: 0.5,
      };
    case "tickets":
      return {
        model: MODEL_ADDONS(),
        mode: "structured",
        webSearch: false,
        useRag: false,
        temperature: 0.4,
      };
  }
}
