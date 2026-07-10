import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { references, type Reference, type NewReference } from "@/db/schema";

/** Insert reference rows for a project (UI/UX inspiration). */
export async function insertReferences(
  projectId: string,
  refs: {
    kind: "link" | "image";
    url: string;
    storageKey?: string;
    note?: string;
  }[],
): Promise<Reference[]> {
  if (refs.length === 0) return [];
  const values: NewReference[] = refs.map((r) => ({
    projectId,
    kind: r.kind,
    url: r.url,
    storageKey: r.storageKey ?? null,
    note: r.note ?? null,
  }));
  return db.insert(references).values(values).returning();
}

export async function listReferencesForProject(
  projectId: string,
): Promise<Reference[]> {
  return db
    .select()
    .from(references)
    .where(eq(references.projectId, projectId));
}

export async function deleteReference(
  id: string,
  projectId: string,
): Promise<void> {
  await db
    .delete(references)
    .where(and(eq(references.id, id), eq(references.projectId, projectId)));
}
