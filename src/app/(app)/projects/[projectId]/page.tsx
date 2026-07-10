import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import type { DocType } from "@/types";
import { getProjectForUser } from "@/db/queries/projects";
import { getDocument, listUserFacingDocuments } from "@/db/queries/documents";
import { getLatestRunForProject } from "@/db/queries/pipeline";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/chip";
import { PipelineStatus } from "@/components/pipeline-status";
import { DocPanel } from "@/components/doc-panel";
import { PackageComplete } from "@/components/package-complete";

/**
 * Pipeline Status + PRD Viewer (T-033) with add-on + package states (T-045).
 *
 * Server Component: renders the right surface for the project's phase —
 * PRD stepper → PRD viewer → add-on stepper → package screen — while the live
 * stepper refreshes this page as the pipeline advances.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  const project = await getProjectForUser(projectId, user.id);
  if (!project) notFound();

  // Full package done → package screen.
  if (project.status === "complete") {
    const docs = await listUserFacingDocuments(projectId);
    return (
      <PackageComplete
        projectId={projectId}
        docTypes={docs.map((d) => d.type as DocType)}
      />
    );
  }

  // Add-ons generating → live add-on stepper.
  if (project.status === "addons_pending") {
    return (
      <div className="flex flex-col gap-sp-5">
        <h2 className="text-h2 uppercase">GENERATING DOCS</h2>
        <Card variant="elevated">
          <PipelineStatus projectId={projectId} />
        </Card>
      </div>
    );
  }

  // PRD phase.
  const run = await getLatestRunForProject(projectId, "prd");
  const prd = await getDocument(projectId, "prd");
  const isReady = run?.status === "complete" && prd?.status === "ready";

  if (isReady && prd) {
    return (
      <div className="flex flex-col gap-sp-5">
        <div className="flex items-center gap-sp-4">
          <h2 className="text-h2 uppercase">PRD READY</h2>
          <StatusChip status="success">PRD ONLY</StatusChip>
        </div>
        <DocPanel
          projectId={projectId}
          docType="prd"
          content={prd.content}
          lastEditedByUser={prd.lastEditedByUser}
          continueHref={`/projects/${projectId}/addons`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sp-5">
      <h2 className="text-h2 uppercase">{project.title ?? "YOUR PRD"}</h2>
      <Card variant="elevated">
        <PipelineStatus projectId={projectId} />
      </Card>
    </div>
  );
}
