"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getProjectForUser, createProject as createProjectRow } from "@/db/queries/projects";
import { updateDocumentContentForUser } from "@/db/queries/documents";
import {
  createPipelineRun,
  seedPipelineSteps,
  getLatestRunForProject,
  updateRunStatus,
  resetStepsForRerun,
} from "@/db/queries/pipeline";
import { inngest } from "@/inngest/client";
import type { AddonDocType, DocType } from "@/types";
import { ADDON_DOC_TYPES } from "@/types";

/** Fixed PRD pipeline steps, in execution order. */
const PRD_STEPS = [
  { agent: "research" as const, orderIndex: 0 },
  { agent: "draft" as const, orderIndex: 1 },
  { agent: "refine" as const, orderIndex: 2 },
];

export type CreateProjectResult =
  | { projectId: string }
  | { paymentRequired: true };

/**
 * createProject (T-031, FRONTEND-SPEC B7).
 *
 * Resolves the user, runs the server-side quota check, and — when allowed —
 * creates the project (draft) + a PRD pipeline_run with three pending steps,
 * then emits `project/prd.requested`. Returns { paymentRequired } when over
 * quota so the client can open the paywall.
 *
 * NOTE: quota is stubbed to "allowed" here; T-050 replaces `checkQuota` with
 * the real monthly_usage check + atomic reservation.
 */
export async function createProject(input: {
  ideaText: string;
  ideaMeta?: { problem?: string; audience?: string; scope?: string };
}): Promise<CreateProjectResult> {
  const user = await requireUser();

  const ideaText = input.ideaText?.trim();
  if (!ideaText) throw new Error("Idea text is required.");

  const quota = await checkQuota(user.id);
  if (!quota.allowed) return { paymentRequired: true };

  // Derive an initial title from the idea (the pipeline may refine it later).
  const title = ideaText.split("\n")[0].slice(0, 80);

  const ideaMeta = cleanMeta(input.ideaMeta);

  const project = await createProjectRow({
    userId: user.id,
    ideaText,
    ideaMeta,
    title,
    status: "draft",
  });

  const run = await createPipelineRun({ projectId: project.id, kind: "prd" });
  await seedPipelineSteps(run.id, PRD_STEPS);

  await inngest.send({
    name: "project/prd.requested",
    data: { projectId: project.id, userId: user.id },
  });

  return { projectId: project.id };
}

/**
 * editDocument (T-034, FRONTEND-SPEC A6.5). Saves an edited document and marks
 * it hand-edited (so a later regenerate warns before overwriting). Owner-scoped
 * — resolves the project by userId first, so a caller can't edit another user's
 * doc. Generic over docType (serves the PRD and all add-on docs).
 */
export async function editDocument(input: {
  projectId: string;
  docType: DocType;
  content: string;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();

  const project = await getProjectForUser(input.projectId, user.id);
  if (!project) throw new Error("Project not found.");

  const updated = await updateDocumentContentForUser({
    projectId: input.projectId,
    type: input.docType,
    content: input.content,
  });
  if (!updated) throw new Error("Document not found.");

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * regenerate (T-035, PRD §5.1 / §9). Re-runs a document's pipeline with
 * optional focus notes and overwrites in place — no version history. Resets the
 * relevant pipeline_steps to pending so the stepper re-animates.
 *
 * docType 'prd' (or omitted) re-runs the whole PRD pipeline; an add-on docType
 * re-runs just that add-on (the add-on pipeline, T-043, handles the subset).
 */
export async function regenerate(input: {
  projectId: string;
  docType?: DocType;
  notes?: string;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const project = await getProjectForUser(input.projectId, user.id);
  if (!project) throw new Error("Project not found.");

  const isPrd =
    !input.docType ||
    input.docType === "prd" ||
    input.docType === "research_brief";

  if (isPrd) {
    const run = await getLatestRunForProject(input.projectId, "prd");
    if (!run) throw new Error("No PRD run to regenerate.");
    await resetStepsForRerun(run.id, ["research", "draft", "refine"]);
    await updateRunStatus(run.id, {
      status: "queued",
      startedAt: null,
      completedAt: null,
    });
    await inngest.send({
      name: "project/prd.requested",
      data: { projectId: input.projectId, userId: user.id, notes: input.notes },
    });
  } else {
    const docType = input.docType as AddonDocType;
    if (!ADDON_DOC_TYPES.includes(docType)) {
      throw new Error(`Cannot regenerate doc type: ${docType}`);
    }
    const run = await getLatestRunForProject(input.projectId, "addons");
    if (run) await resetStepsForRerun(run.id, [docType]);
    await inngest.send({
      name: "project/addons.requested",
      data: {
        projectId: input.projectId,
        userId: user.id,
        requestedDocs: [docType],
        notes: input.notes,
      },
    });
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/** TEMP quota stub — always allows. Replaced by lib/quota in T-050. */
async function checkQuota(userId: string): Promise<{ allowed: boolean }> {
  void userId; // T-050: count monthly_usage for this user vs FREE_PROJECTS_PER_MONTH
  return { allowed: true };
}

function cleanMeta(
  meta?: { problem?: string; audience?: string; scope?: string },
): Record<string, string> | undefined {
  if (!meta) return undefined;
  const entries = Object.entries(meta).filter(([, v]) => v?.trim());
  return entries.length
    ? Object.fromEntries(entries.map(([k, v]) => [k, v!.trim()]))
    : undefined;
}
