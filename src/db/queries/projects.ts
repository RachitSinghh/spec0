import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, type NewProject, type Project } from "@/db/schema";

/**
 * Project queries. Access control is enforced HERE: every read/write is scoped
 * to the owning `userId`, so a caller can never touch another user's project.
 * Downstream document/run/step reads gate on `getProjectForUser` first.
 */

/** Fetch a single project, but only if it belongs to `userId`. */
export async function getProjectForUser(
  id: string,
  userId: string,
): Promise<Project | null> {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** All of a user's projects, newest first. */
export async function listProjectsForUser(userId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function createProject(
  input: Omit<NewProject, "id" | "createdAt" | "updatedAt">,
): Promise<Project> {
  const rows = await db.insert(projects).values(input).returning();
  return rows[0];
}

/** Update a project, scoped to its owner. Returns the updated row or null. */
export async function updateProject(
  id: string,
  userId: string,
  patch: Partial<
    Pick<NewProject, "title" | "status" | "billingStatus" | "ideaMeta">
  >,
): Promise<Project | null> {
  const rows = await db
    .update(projects)
    .set(patch)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();
  return rows[0] ?? null;
}
