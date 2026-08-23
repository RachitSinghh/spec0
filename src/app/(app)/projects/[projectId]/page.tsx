import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import type { DocType } from "@/types";
import { getProjectForUser } from "@/db/queries/projects";
import { getDocument, listUserFacingDocuments } from "@/db/queries/documents";
import { getLatestRunForProject, getTokenTotalsForUser } from "@/db/queries/pipeline";
import { DOC_META } from "@/lib/markdown";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/chip";
import { PipelineStatus } from "@/components/pipeline-status";
import { DocPanel } from "@/components/doc-panel";
import { PackageComplete, type PackageFile } from "@/components/package-complete";

/** Pipeline/build order — the manifest is numbered by this sequence. */
const DOC_ORDER: DocType[] = ["prd", "technical", "security", "ui_ux", "tickets"];

function wordCount(content: string): number {
  const t = content.trim();
  return t ? t.split(/\s+/).length : 0;
}

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
    const [docs, tokenTotals] = await Promise.all([
      listUserFacingDocuments(projectId),
      getTokenTotalsForUser(user.id),
    ]);
    const files: PackageFile[] = docs
      .map((d) => ({ d, type: d.type as DocType, meta: DOC_META[d.type as DocType] }))
      .filter((f) => f.meta?.filename)
      .map((f) => ({
        type: f.type,
        title: f.meta.title,
        filename: f.meta.filename as string,
        words: wordCount(f.d.content),
        edited: f.d.lastEditedByUser,
      }))
      .sort((a, b) => DOC_ORDER.indexOf(a.type) - DOC_ORDER.indexOf(b.type));
    return (
      <PackageComplete
        projectId={projectId}
        files={files}
        totalTokens={tokenTotals[projectId] ?? 0}
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
      {project.status === "payment_pending" && (
        <p className="border-thick border-warning p-sp-3 font-mono text-small text-warning">
          AWAITING PAYMENT — generation starts the moment your payment is
          confirmed. If you closed checkout, go back to New Project and unlock
          again.
        </p>
      )}
      <Card variant="elevated">
        <PipelineStatus projectId={projectId} />
      </Card>
    </div>
  );
}
