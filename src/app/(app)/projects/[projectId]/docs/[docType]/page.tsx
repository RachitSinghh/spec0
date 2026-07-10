import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { docTitle } from "@/lib/markdown";
import { DOC_TYPES, type DocType } from "@/types";
import { getProjectForUser } from "@/db/queries/projects";
import { getDocument } from "@/db/queries/documents";
import { getLatestRunForProject, getStepsForRun } from "@/db/queries/pipeline";
import { Card } from "@/components/ui/card";
import { PipelineStatus } from "@/components/pipeline-status";
import { DocPanel } from "@/components/doc-panel";

/**
 * Per-doc review page (T-044, FRONTEND-SPEC A6.7). Reuses the viewer/editor
 * pattern (DocPanel) with the doc title in h3 and per-doc EDIT/REGENERATE.
 * Shows the add-on stepper while this doc is still generating.
 */
export default async function DocPage({
  params,
}: {
  params: Promise<{ projectId: string; docType: string }>;
}) {
  const { projectId, docType } = await params;
  if (!DOC_TYPES.includes(docType as DocType) || docType === "research_brief") {
    notFound();
  }
  const type = docType as DocType;

  const user = await requireUser();
  const project = await getProjectForUser(projectId, user.id);
  if (!project) notFound();

  const doc = await getDocument(projectId, type);

  // Is this doc still being generated in the latest add-on run?
  const run = await getLatestRunForProject(projectId, "addons");
  const steps = run ? await getStepsForRun(run.id) : [];
  const step = steps.find((s) => s.agent === type);
  const generating =
    step?.status === "pending" || step?.status === "running" || !doc;

  if (doc && doc.status === "ready" && !generating) {
    return (
      <div className="flex flex-col gap-sp-5">
        <h3 className="text-h3 uppercase">{docTitle(type)}</h3>
        <DocPanel
          projectId={projectId}
          docType={type}
          content={doc.content}
          lastEditedByUser={doc.lastEditedByUser}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sp-5">
      <h3 className="text-h3 uppercase">{docTitle(type)}</h3>
      <Card variant="elevated">
        <PipelineStatus projectId={projectId} />
      </Card>
    </div>
  );
}
