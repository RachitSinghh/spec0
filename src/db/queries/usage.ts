import "server-only";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { monthlyUsage, type MonthlyUsage } from "@/db/schema";

/** Calendar-month key, e.g. "2026-07". */
export function currentPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Read a user's usage row for a period (null if none yet). */
export async function getMonthlyUsage(
  userId: string,
  period: string,
): Promise<MonthlyUsage | null> {
  const rows = await db
    .select()
    .from(monthlyUsage)
    .where(
      and(eq(monthlyUsage.userId, userId), eq(monthlyUsage.period, period)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Count of projects created by a user in a period (0 if no row). */
export async function getProjectsCreated(
  userId: string,
  period: string,
): Promise<number> {
  const row = await getMonthlyUsage(userId, period);
  return row?.projectsCreated ?? 0;
}

/**
 * Atomically increment the monthly counter and return the NEW count.
 *
 * A single upsert statement (insert … on conflict do update … + 1) so
 * concurrent "New Project" clicks can't both read the same stale count and
 * both slip under the quota — the DB serializes the increment.
 */
export async function incrementMonthlyUsage(
  userId: string,
  period: string,
): Promise<number> {
  const rows = await db
    .insert(monthlyUsage)
    .values({ userId, period, projectsCreated: 1 })
    .onConflictDoUpdate({
      target: [monthlyUsage.userId, monthlyUsage.period],
      set: {
        projectsCreated: sql`${monthlyUsage.projectsCreated} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ projectsCreated: monthlyUsage.projectsCreated });
  return rows[0].projectsCreated;
}

/** Release a reserved slot (over-quota reject or failed create). */
export async function decrementMonthlyUsage(
  userId: string,
  period: string,
): Promise<void> {
  await db
    .update(monthlyUsage)
    .set({
      projectsCreated: sql`greatest(${monthlyUsage.projectsCreated} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(monthlyUsage.userId, userId), eq(monthlyUsage.period, period)),
    );
}
