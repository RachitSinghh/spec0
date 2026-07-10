import { Readable } from "node:stream";
import { ZipArchive } from "archiver";

import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser } from "@/db/queries/projects";
import { listUserFacingDocuments } from "@/db/queries/documents";
import { exportFilename } from "@/lib/markdown";

export const runtime = "nodejs";

/**
 * Zip export (T-045, FRONTEND-SPEC B7). Streams an application/zip built with
 * archiver from all is_user_facing documents, named via the canonical filename
 * map. research_brief is excluded (it isn't user-facing). Owner-scoped.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;

  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const project = await getProjectForUser(projectId, user.id);
  if (!project) return new Response("not found", { status: 404 });

  const docs = await listUserFacingDocuments(projectId);
  const exportable = docs
    .map((d) => ({ name: exportFilename(d.type), content: d.content }))
    .filter((d): d is { name: string; content: string } => d.name !== null);

  if (exportable.length === 0) {
    return new Response("no documents to export", { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  for (const d of exportable) archive.append(d.content, { name: d.name });
  void archive.finalize();

  // Stream the archive out; bytes are never buffered fully in memory.
  const webStream = Readable.toWeb(archive) as ReadableStream<Uint8Array>;
  const safeTitle = (project.title ?? "spec0-project")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 40);

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeTitle}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
