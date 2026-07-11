import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { getMeshDeps } from "@/inngest/mesh-deps";
import { runAgent } from "@/agents/run-agent";
import type { AgentContext, PriorDoc, ReferenceInput } from "@/agents/types";
import { getProjectForUser, updateProject } from "@/db/queries/projects";
import { getDocument, upsertDocument } from "@/db/queries/documents";
import { listReferencesForProject } from "@/db/queries/references";
import {
  getLatestRunForProject,
  updateRunStatus,
  updateStepByAgent,
  getStepsForRun,
} from "@/db/queries/pipeline";
import { ADDON_DOC_TYPES, type AddonDocType } from "@/types";

/**
 * runAddonPipeline (T-043, TECHNICAL-ARCHITECTURE §3.2).
 *
 * Generates the selected add-on docs in the FIXED order technical → security →
 * ui_ux → tickets, skipping unselected ones. Each step reads the PRD + every
 * add-on generated BEFORE it in this run (the "read everything before me"
 * contract). The ui_ux step also loads uploaded references. Steps are memoized;
 * each writes model/tokens/latency to its pipeline_step. On completion the
 * project flips to `complete`.
 */
export const runAddonPipeline = inngest.createFunction(
  {
    id: "run-addon-pipeline",
    retries: 2,
    onFailure: markAddonRunFailed,
    triggers: [{ event: "project/addons.requested" }],
  },
  async ({ event, step, runId: inngestRunId }) => {
    const { projectId, userId, requestedDocs, notes } = event.data;
    const mesh = getMeshDeps();
    const selected = new Set<AddonDocType>(requestedDocs);

    const project = await step.run("load-project", async () => {
      const p = await getProjectForUser(projectId, userId);
      if (!p) throw new NonRetriableError(`project ${projectId} not found`);
      return p;
    });

    const { runId, prdContent } = await step.run("start-run", async () => {
      const run = await getLatestRunForProject(projectId, "addons");
      if (!run) throw new NonRetriableError(`no addons run for ${projectId}`);
      const prd = await getDocument(projectId, "prd");
      if (!prd) throw new NonRetriableError(`no PRD to build add-ons from`);
      await updateRunStatus(run.id, {
        status: "running",
        startedAt: new Date(),
        inngestRunId,
      });
      return { runId: run.id, prdContent: prd.content };
    });

    // "Read everything before me": start with the PRD, accumulate each doc.
    const priorDocs: PriorDoc[] = [{ type: "prd", content: prdContent }];

    for (const agent of ADDON_DOC_TYPES) {
      if (!selected.has(agent)) continue; // step already seeded as skipped

      const snapshot = [...priorDocs];
      const content = await step.run(agent, async () => {
        await updateStepByAgent(runId, agent, {
          status: "running",
          startedAt: new Date(),
          error: null, // clear any error from a previous attempt
        });
        try {
          let references: ReferenceInput[] | undefined;
          if (agent === "ui_ux") {
            const refs = await listReferencesForProject(projectId);
            references = refs.map((r) => ({
              kind: r.kind,
              url: r.url,
              note: r.note ?? undefined,
              storageKey: r.storageKey ?? undefined,
            }));
          }
          const ctx: AgentContext = {
            idea: project.ideaText,
            ideaMeta: project.ideaMeta ?? undefined,
            priorDocs: snapshot,
            references,
            notes,
          };
          const res = await runAgent(agent, ctx, mesh);
          await upsertDocument({
            projectId,
            type: agent,
            content: res.content,
            isUserFacing: true,
            status: "ready",
            lastEditedByUser: false,
          });
          await updateStepByAgent(runId, agent, {
            status: "complete",
            model: res.model,
            inputTokens: res.usage.input_tokens,
            outputTokens: res.usage.output_tokens,
            latencyMs: res.latency_ms,
            completedAt: new Date(),
          });
          return res.content;
        } catch (err) {
          await updateStepByAgent(runId, agent, {
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          });
          throw err;
        }
      });
      priorDocs.push({ type: agent, content });
    }

    await step.run("finish", async () => {
      await updateRunStatus(runId, { status: "complete", completedAt: new Date() });
      await updateProject(projectId, userId, { status: "complete" });
    });

    return { projectId, status: "complete" };
  },
);

async function markAddonRunFailed({
  event,
}: {
  event: { data: { event: { data: { projectId: string; userId: string } } } };
}) {
  const { projectId, userId } = event.data.event.data;
  const run = await getLatestRunForProject(projectId, "addons");
  if (run) {
    await updateRunStatus(run.id, { status: "failed", completedAt: new Date() });
    const steps = await getStepsForRun(run.id);
    for (const s of steps) {
      if (s.status === "pending" || s.status === "running") {
        await updateStepByAgent(run.id, s.agent, { status: "failed" });
      }
    }
  }
  await updateProject(projectId, userId, { status: "failed" });
}
