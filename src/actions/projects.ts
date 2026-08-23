"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { limits } from "@/lib/env";
import { getProjectForUser, createProject as createProjectRow } from "@/db/queries/projects";
import {
  currentPeriod,
  incrementMonthlyUsage,
  decrementMonthlyUsage,
} from "@/db/queries/usage";
import { updateDocumentContentForUser } from "@/db/queries/documents";
import {
  createPipelineRun,
  seedPipelineSteps,
  getLatestRunForProject,
  getStepsForRun,
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
  /** Optional docs picked at intake → auto-generate right after the PRD. */
  docs?: AddonDocType[];
}): Promise<CreateProjectResult> {
  const user = await requireUser();

  const ideaText = input.ideaText?.trim();
  if (!ideaText) throw new Error("Idea text is required.");

  const quota = await checkQuota(user.id);
  if (!quota.allowed) return { paymentRequired: true };

  try {
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

    // Keep only valid doc types, in the fixed generation order.
    const autoDocs = ADDON_DOC_TYPES.filter((d) => input.docs?.includes(d));

    await sendOrFailRun(run.id, {
      name: "project/prd.requested",
      data: {
        projectId: project.id,
        userId: user.id,
        autoDocs: autoDocs.length ? autoDocs : undefined,
      },
    });

    return { projectId: project.id };
  } catch (err) {
    // Creation failed after reserving a quota slot — give it back.
    await decrementMonthlyUsage(user.id, currentPeriod());
    throw err;
  }
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
    await sendOrFailRun(run.id, {
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
    const event = {
      name: "project/addons.requested",
      data: {
        projectId: input.projectId,
        userId: user.id,
        requestedDocs: [docType],
        notes: input.notes,
      },
    } as const;
    if (run) await sendOrFailRun(run.id, event);
    else await inngest.send(event);
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * retryRun: re-fire the latest run after a failure or a lost event (e.g. the
 * event was emitted before the app was synced with Inngest). PRD runs re-run
 * all three steps (regenerate semantics, carrying any stashed autoDocs);
 * add-on runs re-request only the docs that never completed.
 */
export async function retryRun(input: { projectId: string }): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const project = await getProjectForUser(input.projectId, user.id);
  if (!project) throw new Error("Project not found.");
  // Paywall guard: a payment_pending project has a seeded run; retrying it must
  // not generate for free. Unlock only happens when payment succeeds.
  if (project.status === "payment_pending") {
    throw new Error("Payment required before this project can generate.");
  }

  const run = await getLatestRunForProject(input.projectId);
  if (!run) throw new Error("Nothing to retry.");

  if (run.kind === "prd") {
    await resetStepsForRerun(run.id, ["research", "draft", "refine"]);
    await updateRunStatus(run.id, { status: "queued", startedAt: null, completedAt: null });
    const autoDocs = (run.requestedDocs ?? []) as AddonDocType[];
    await sendOrFailRun(run.id, {
      name: "project/prd.requested",
      data: {
        projectId: input.projectId,
        userId: user.id,
        autoDocs: autoDocs.length ? autoDocs : undefined,
      },
    });
  } else {
    const steps = await getStepsForRun(run.id);
    const docs = steps
      .filter((s) => s.status !== "complete" && s.status !== "skipped")
      .map((s) => s.agent) as AddonDocType[];
    if (docs.length > 0) {
      await resetStepsForRerun(run.id, docs);
      await updateRunStatus(run.id, { status: "queued", startedAt: null, completedAt: null });
      await sendOrFailRun(run.id, {
        name: "project/addons.requested",
        data: { projectId: input.projectId, userId: user.id, requestedDocs: docs },
      });
    }
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/**
 * Emit a pipeline event; if the send fails (e.g. Inngest unreachable), mark
 * the run failed instead of leaving a zombie stuck in "queued" forever.
 */
async function sendOrFailRun(
  runId: string,
  event: Parameters<typeof inngest.send>[0],
): Promise<void> {
  try {
    await inngest.send(event);
  } catch (err) {
    await updateRunStatus(runId, { status: "failed", completedAt: new Date() });
    console.error("inngest.send failed", err);
    throw new Error(
      "Could not start the pipeline (background worker unreachable). Try again.",
    );
  }
}

/**
 * Monthly quota (T-050, minus Stripe). Atomically reserves a slot via the
 * monthly_usage upsert — concurrent creates can't both slip under the limit.
 * Over the limit → release the reservation and report not-allowed (the intake
 * form shows the paywall state). Regenerates never hit this — only new projects.
 */
async function checkQuota(userId: string): Promise<{ allowed: boolean }> {
  const period = currentPeriod();
  const newCount = await incrementMonthlyUsage(userId, period);
  if (newCount > limits.freeProjectsPerMonth) {
    await decrementMonthlyUsage(userId, period);
    return { allowed: false };
  }
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
