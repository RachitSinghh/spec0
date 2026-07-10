import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { getMeshDeps } from "@/inngest/mesh-deps";
import { runAgent } from "@/agents/run-agent";
import type { AgentContext } from "@/agents/types";
import { getProjectForUser, updateProject } from "@/db/queries/projects";
import { upsertDocument } from "@/db/queries/documents";
import {
  getLatestRunForProject,
  updateRunStatus,
  updateStepByAgent,
  getStepsForRun,
} from "@/db/queries/pipeline";

/**
 * runPrdPipeline (T-023, TECHNICAL-ARCHITECTURE §3.2).
 *
 * Three memoized steps: research (web search → research_brief, internal) →
 * draft (→ prd) → refine (overwrite prd with the final version). Each step
 * boundary flips its pipeline_steps row pending→running→complete/failed and
 * records model/tokens/latency/timestamps. Steps are memoized: a retry never
 * re-runs (or re-pays for) a completed step. Regeneration re-emits the same
 * event and overwrites documents in place (no version history).
 */
export const runPrdPipeline = inngest.createFunction(
  {
    id: "run-prd-pipeline",
    retries: 2,
    onFailure: markRunFailed,
    triggers: [{ event: "project/prd.requested" }],
  },
  async ({ event, step, runId: inngestRunId }) => {
    const { projectId, userId, notes } = event.data;
    const mesh = getMeshDeps();

    const project = await step.run("load-project", async () => {
      const p = await getProjectForUser(projectId, userId);
      if (!p) throw new NonRetriableError(`project ${projectId} not found`);
      return p;
    });

    const runId = await step.run("start-run", async () => {
      const run = await getLatestRunForProject(projectId, "prd");
      if (!run) throw new NonRetriableError(`no prd run for ${projectId}`);
      await updateRunStatus(run.id, {
        status: "running",
        startedAt: new Date(),
        inngestRunId,
      });
      return run.id;
    });

    const ideaMeta = project.ideaMeta ?? undefined;

    // 1) Research (web search) → internal research_brief
    const brief = await step.run("research", async () => {
      await updateStepByAgent(runId, "research", {
        status: "running",
        startedAt: new Date(),
      });
      try {
        const ctx: AgentContext = { idea: project.ideaText, ideaMeta, priorDocs: [], notes };
        const res = await runAgent("research", ctx, mesh);
        await upsertDocument({
          projectId,
          type: "research_brief",
          content: res.content,
          isUserFacing: false,
          status: "ready",
        });
        await completeStep(runId, "research", res);
        return res.content;
      } catch (err) {
        await failStep(runId, "research", err);
        throw err;
      }
    });

    // 2) Draft → prd
    const draft = await step.run("draft", async () => {
      await updateStepByAgent(runId, "draft", { status: "running", startedAt: new Date() });
      try {
        const ctx: AgentContext = {
          idea: project.ideaText,
          ideaMeta,
          priorDocs: [{ type: "research_brief", content: brief }],
          notes,
        };
        const res = await runAgent("draft", ctx, mesh);
        await upsertDocument({
          projectId,
          type: "prd",
          content: res.content,
          isUserFacing: true,
          status: "generating",
        });
        await completeStep(runId, "draft", res);
        return res.content;
      } catch (err) {
        await failStep(runId, "draft", err);
        throw err;
      }
    });

    // 3) Refine → overwrite prd with the final version
    await step.run("refine", async () => {
      await updateStepByAgent(runId, "refine", { status: "running", startedAt: new Date() });
      try {
        const ctx: AgentContext = {
          idea: project.ideaText,
          ideaMeta,
          priorDocs: [{ type: "prd (draft)", content: draft }],
          notes,
        };
        const res = await runAgent("refine", ctx, mesh);
        await upsertDocument({
          projectId,
          type: "prd",
          content: res.content,
          isUserFacing: true,
          status: "ready",
          lastEditedByUser: false,
        });
        await completeStep(runId, "refine", res);
      } catch (err) {
        await failStep(runId, "refine", err);
        throw err;
      }
    });

    await step.run("finish", async () => {
      await updateRunStatus(runId, { status: "complete", completedAt: new Date() });
      // PRD-ready projects stay in `draft` (per §5.2); `complete` is reserved
      // for after the add-on package is generated.
    });

    return { projectId, status: "complete" };
  },
);

// ─── helpers ────────────────────────────────────────────────────────────────

async function completeStep(
  runId: string,
  agent: "research" | "draft" | "refine",
  res: { model: string; usage: { input_tokens: number; output_tokens: number }; latency_ms: number },
) {
  await updateStepByAgent(runId, agent, {
    status: "complete",
    model: res.model,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
    latencyMs: res.latency_ms,
    completedAt: new Date(),
  });
}

async function failStep(runId: string, agent: "research" | "draft" | "refine", err: unknown) {
  await updateStepByAgent(runId, agent, {
    status: "failed",
    error: err instanceof Error ? err.message : String(err),
    completedAt: new Date(),
  });
}

/**
 * Terminal-failure rollup: mark the run + project failed. In an onFailure
 * handler the `event` is the internal `inngest/function.failed` event; the
 * original triggering event is nested at `event.data.event`.
 */
export async function markRunFailed({
  event,
}: {
  event: { data: { event: { data: { projectId: string; userId: string } } } };
}) {
  const { projectId, userId } = event.data.event.data;
  const run = await getLatestRunForProject(projectId, "prd");
  if (run) {
    await updateRunStatus(run.id, { status: "failed", completedAt: new Date() });
    // Any step still pending/running when the run died is marked failed.
    const steps = await getStepsForRun(run.id);
    for (const s of steps) {
      if (s.status === "pending" || s.status === "running") {
        await updateStepByAgent(run.id, s.agent, { status: "failed" });
      }
    }
  }
  await updateProject(projectId, userId, { status: "failed" });
}
