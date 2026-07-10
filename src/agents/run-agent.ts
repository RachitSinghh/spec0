import {
  type AgentContext,
  type AgentName,
  type AgentResult,
  type AgentTracer,
  type MeshDeps,
} from "@/agents/types";
import { getAgentConfig } from "@/agents/config";
import {
  researchBriefSchema,
  ticketListSchema,
  type ResearchBrief,
  type TicketList,
} from "@/agents/schemas";
import { RESEARCH_SYSTEM_PROMPT } from "@/agents/prompts/research";
import { DRAFT_SYSTEM_PROMPT } from "@/agents/prompts/draft";
import { REFINE_SYSTEM_PROMPT } from "@/agents/prompts/refine";
import { TECHNICAL_SYSTEM_PROMPT } from "@/agents/prompts/technical";
import { SECURITY_SYSTEM_PROMPT } from "@/agents/prompts/security";
import { UI_UX_SYSTEM_PROMPT } from "@/agents/prompts/ui-ux";
import { TICKETS_SYSTEM_PROMPT } from "@/agents/prompts/tickets";

const SYSTEM_PROMPTS: Record<AgentName, string> = {
  research: RESEARCH_SYSTEM_PROMPT,
  draft: DRAFT_SYSTEM_PROMPT,
  refine: REFINE_SYSTEM_PROMPT,
  technical: TECHNICAL_SYSTEM_PROMPT,
  security: SECURITY_SYSTEM_PROMPT,
  ui_ux: UI_UX_SYSTEM_PROMPT,
  tickets: TICKETS_SYSTEM_PROMPT,
};

/** Assemble the user prompt: idea + all prior docs ("read everything before me"). */
function buildUserPrompt(ctx: AgentContext, ragSnippets: string[]): string {
  const parts: string[] = [];
  parts.push(`# Idea\n${ctx.idea}`);

  if (ctx.ideaMeta && Object.keys(ctx.ideaMeta).length > 0) {
    const meta = Object.entries(ctx.ideaMeta)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");
    if (meta) parts.push(`# Additional context\n${meta}`);
  }

  for (const doc of ctx.priorDocs) {
    parts.push(`# ${doc.type.toUpperCase()} (prior document)\n${doc.content}`);
  }

  if (ctx.references && ctx.references.length > 0) {
    const refs = ctx.references
      .map((r) =>
        r.kind === "link"
          ? `- link: ${r.url}${r.note ? ` — ${r.note}` : ""}`
          : `- image: ${r.url}${r.note ? ` — ${r.note}` : ""}`,
      )
      .join("\n");
    parts.push(`# Design references\n${refs}`);
  }

  if (ragSnippets.length > 0) {
    parts.push(
      `# Reference excerpts (cite these)\n${ragSnippets.map((s) => `> ${s}`).join("\n")}`,
    );
  }

  if (ctx.notes?.trim()) {
    parts.push(`# Regeneration focus\n${ctx.notes.trim()}`);
  }

  return parts.join("\n\n");
}

function renderBrief(b: ResearchBrief): string {
  const lines: string[] = ["# Research Brief", "", "## Problem Statement", b.problemStatement, "", "## Target Users"];
  for (const u of b.targetUsers) lines.push(`- ${u}`);
  lines.push("", "## Competitors");
  for (const c of b.competitors) lines.push(`- **${c.name}** — ${c.note}`);
  lines.push("", "## Market Notes");
  for (const m of b.marketNotes) lines.push(`- ${m}`);
  lines.push("", "## Risks");
  for (const r of b.risks) lines.push(`- ${r}`);
  return lines.join("\n");
}

function renderTicketList(list: TicketList): string {
  const lines: string[] = ["# Tickets", ""];
  for (const epic of list.epics) {
    lines.push(`## ${epic.name}`, "");
    for (const t of epic.tickets) {
      lines.push(`### ${t.id} — ${t.title}`);
      lines.push(`**Priority:** ${t.priority}`);
      if (t.dependencies.length)
        lines.push(`**Dependencies:** ${t.dependencies.join(", ")}`);
      lines.push("", t.description, "", "**Acceptance criteria:**");
      for (const ac of t.acceptanceCriteria) lines.push(`- [ ] ${ac}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

/**
 * Run a single agent (T-021). Selects the model/settings from config, assembles
 * the context, calls the right Mesh helper (web search for research, RAG for
 * ui_ux, structured output for research + tickets), and returns Markdown +
 * usage. Mesh is injected so this stays free of server-only imports.
 */
export async function runAgent(
  agent: AgentName,
  ctx: AgentContext,
  mesh: MeshDeps,
  tracer?: AgentTracer,
): Promise<AgentResult> {
  const cfg = getAgentConfig(agent);
  const system = SYSTEM_PROMPTS[agent];

  // RAG for ui_ux: pull grounded, cited snippets from uploaded references.
  let ragSnippets: string[] = [];
  if (cfg.useRag && mesh.vectorSearch && ctx.references?.length) {
    const fileIds = ctx.references.map((r) => r.fileId).filter(Boolean) as string[];
    if (fileIds.length) {
      try {
        const results = await mesh.vectorSearch({
          query: `UI and UX patterns relevant to: ${ctx.idea}`,
          fileIds,
        });
        ragSnippets = results.map((r) =>
          r.source ? `${r.text} (source: ${r.source})` : r.text,
        );
      } catch {
        // RAG is best-effort; fall back to inline references.
      }
    }
  }

  const prompt = buildUserPrompt(ctx, ragSnippets);
  const base = {
    model: cfg.model,
    system,
    prompt,
    temperature: cfg.temperature,
    maxOutputTokens: cfg.maxOutputTokens,
    webSearch: cfg.webSearch,
  };

  let content: string;
  let usage;
  let model: string;
  let latency_ms: number;

  if (agent === "research") {
    const res = await mesh.generateStructured(base, researchBriefSchema);
    content = renderBrief(res.content);
    ({ usage, model, latency_ms } = res);
  } else if (agent === "tickets") {
    const res = await mesh.generateStructured(base, ticketListSchema);
    content = renderTicketList(res.content);
    ({ usage, model, latency_ms } = res);
  } else {
    const res = await mesh.generate(base);
    content = res.content;
    ({ usage, model, latency_ms } = res);
  }

  tracer?.({ agent, model, usage, latency_ms });
  return { content, usage, model, latency_ms };
}
