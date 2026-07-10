import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getCurrentUser } from "@/lib/auth";
import { limits } from "@/lib/env";
import { getProjectForUser } from "@/db/queries/projects";
import { presignPut, publicUrl } from "@/lib/storage";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Presigned upload endpoint (T-041, FRONTEND-SPEC B5).
 *
 * Validates content-type (image only) and size (<= MAX_UPLOAD_MB) SERVER-SIDE,
 * then returns a short-lived presigned PUT URL. The browser PUTs bytes straight
 * to R2 — bytes never proxy through the function.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    projectId?: string;
    contentType?: string;
    sizeBytes?: number;
    filename?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { projectId, contentType, sizeBytes, filename } = body;

  if (!projectId || !contentType || typeof sizeBytes !== "number") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Owner check — can't upload into someone else's project.
  const project = await getProjectForUser(projectId, user.id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `unsupported content type: ${contentType}` },
      { status: 400 },
    );
  }
  if (sizeBytes <= 0 || sizeBytes > limits.maxUploadBytes) {
    return NextResponse.json(
      { error: `file exceeds ${limits.maxUploadMb}MB limit` },
      { status: 400 },
    );
  }

  const ext = filename?.split(".").pop()?.replace(/[^a-z0-9]/gi, "") ?? "bin";
  const storageKey = `references/${projectId}/${randomUUID()}.${ext}`;

  const { url, expiresIn } = await presignPut(storageKey, contentType);
  return NextResponse.json({
    url,
    storageKey,
    expiresIn,
    publicUrl: publicUrl(storageKey),
  });
}
