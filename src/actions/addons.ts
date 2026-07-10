"use server";

import { requireUser } from "@/lib/auth";
import { getProjectForUser, updateProject } from "@/db/queries/projects";
import { createPipelineRun, seedPipelineSteps } from "@/db/queries/pipeline";
import { insertReferences } from "@/db/queries/references";
import { inngest } from "@/inngest/client";
import { ADDON_DOC_TYPES, type AddonDocType, type ReferenceInput } from "@/types";

export type ReviewMode = "each" | "all";

/**
 * requestAddons (T-043, TECHNICAL-ARCHITECTURE §3.2). Creates the add-on
 * pipeline_run, seeds steps in the FIXED order (selected=pending,
 * unselected=skipped), persists UI/UX references, flips the project to
 * addons_pending, and emits `project/addons.requested`.
 */
export async function requestAddons(input: {
  projectId: string;
  docs: AddonDocType[];
  reviewMode: ReviewMode;
  references?: ReferenceInput[];
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const project = await getProjectForUser(input.projectId, user.id);
  if (!project) throw new Error("Project not found.");
  if (input.docs.length === 0) throw new Error("Select at least one document.");

  const selected = new Set(input.docs);

  const run = await createPipelineRun({
    projectId: input.projectId,
    kind: "addons",
    requestedDocs: input.docs,
  });

  // Seed all four add-on steps in fixed order; unselected are skipped.
  await seedPipelineSteps(
    run.id,
    ADDON_DOC_TYPES.map((agent, i) => ({
      agent,
      orderIndex: i,
      status: selected.has(agent) ? ("pending" as const) : ("skipped" as const),
    })),
  );

  // Persist UI/UX references (only relevant when ui_ux is selected).
  if (selected.has("ui_ux") && input.references?.length) {
    await insertReferences(
      input.projectId,
      input.references.map((r) => ({
        kind: r.kind,
        url: r.url,
        storageKey: r.storageKey,
        note: r.note,
      })),
    );
  }

  await updateProject(input.projectId, user.id, { status: "addons_pending" });

  await inngest.send({
    name: "project/addons.requested",
    data: {
      projectId: input.projectId,
      userId: user.id,
      requestedDocs: input.docs,
      references: input.references,
    },
  });

  return { ok: true };
}
