import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  documents,
  type Document,
  type NewDocument,
} from "@/db/schema";
import type { DocType } from "@/types";

/**
 * Document queries. Documents belong to a project; ownership is enforced by
 * resolving the project via `getProjectForUser` BEFORE calling these. The
 * pipeline (Inngest) is a trusted server context and writes by `projectId`.
 */

/**
 * Insert-or-overwrite a document for a project. Respects the
 * UNIQUE(project_id, type) constraint — there is at most one row per
 * (project, type), so regeneration overwrites in place (no version history).
 */
export async function upsertDocument(
  input: Pick<NewDocument, "projectId" | "type"> &
    Partial<
      Pick<
        NewDocument,
        "content" | "isUserFacing" | "status" | "lastEditedByUser"
      >
    >,
): Promise<Document> {
  const rows = await db
    .insert(documents)
    .values(input)
    .onConflictDoUpdate({
      target: [documents.projectId, documents.type],
      set: {
        // Only overwrite the fields that were provided.
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.isUserFacing !== undefined
          ? { isUserFacing: input.isUserFacing }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.lastEditedByUser !== undefined
          ? { lastEditedByUser: input.lastEditedByUser }
          : {}),
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

/** All documents for a project (includes internal research_brief). */
export async function getDocumentsForProject(
  projectId: string,
): Promise<Document[]> {
  return db.select().from(documents).where(eq(documents.projectId, projectId));
}

/** A single document by (project, type). */
export async function getDocument(
  projectId: string,
  type: DocType,
): Promise<Document | null> {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.type, type)))
    .limit(1);
  return rows[0] ?? null;
}

/** User-facing documents only (excludes research_brief) — used for export. */
export async function listUserFacingDocuments(
  projectId: string,
): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.isUserFacing, true),
      ),
    );
}

/**
 * Update a document's content, scoped to its owner via a project join, and
 * mark it hand-edited. Returns the updated row or null if not owned.
 */
export async function updateDocumentContentForUser(params: {
  projectId: string;
  type: DocType;
  content: string;
}): Promise<Document | null> {
  const rows = await db
    .update(documents)
    .set({
      content: params.content,
      lastEditedByUser: true,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.projectId, params.projectId),
        eq(documents.type, params.type),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
