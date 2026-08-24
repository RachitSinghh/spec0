import "server-only";
import { eq, and, ne, lt } from "drizzle-orm";

import { db } from "@/db";
import { payments, type Payment } from "@/db/schema";

/** Record a pending payment for an order. Idempotent on checkoutRef. */
export async function insertPendingPayment(input: {
  userId: string;
  projectId: string;
  checkoutRef: string;
  amountCents: number;
  currency: string;
}): Promise<Payment | null> {
  const rows = await db
    .insert(payments)
    .values({ ...input, status: "pending" })
    .onConflictDoNothing({ target: payments.checkoutRef })
    .returning();
  return rows[0] ?? null;
}

/**
 * Flip a payment to succeeded. Returns true only on the FIRST transition —
 * a duplicate webhook/confirm sees false and must not unlock twice.
 */
export async function markPaymentSucceeded(
  checkoutRef: string,
  paymentRef: string,
): Promise<boolean> {
  const rows = await db
    .update(payments)
    .set({ status: "succeeded", paymentRef })
    .where(
      and(eq(payments.checkoutRef, checkoutRef), ne(payments.status, "succeeded")),
    )
    .returning({ id: payments.id });
  return rows.length > 0;
}

/**
 * Flip a still-pending payment to a terminal non-success state (failed or
 * cancelled webhook). Never touches a succeeded/refunded row, so a late event
 * after success is a no-op.
 */
async function markPaymentTerminal(
  checkoutRef: string,
  status: "failed" | "cancelled",
): Promise<boolean> {
  const rows = await db
    .update(payments)
    .set({ status })
    .where(and(eq(payments.checkoutRef, checkoutRef), eq(payments.status, "pending")))
    .returning({ id: payments.id });
  return rows.length > 0;
}

export const markPaymentFailed = (checkoutRef: string) =>
  markPaymentTerminal(checkoutRef, "failed");
export const markPaymentCancelled = (checkoutRef: string) =>
  markPaymentTerminal(checkoutRef, "cancelled");

/** Payment status for one project (checkoutRef == projectId), or null. */
export async function getPaymentStatusByProject(
  projectId: string,
): Promise<string | null> {
  const rows = await db
    .select({ status: payments.status })
    .from(payments)
    .where(eq(payments.checkoutRef, projectId))
    .limit(1);
  return rows[0]?.status ?? null;
}

/** Map of projectId → payment status for all of a user's payments. */
export async function getPaymentStatusesForUser(
  userId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .select({ projectId: payments.projectId, status: payments.status })
    .from(payments)
    .where(eq(payments.userId, userId));
  const map: Record<string, string> = {};
  for (const r of rows) if (r.projectId) map[r.projectId] = r.status;
  return map;
}

/** Reset a non-succeeded payment back to pending for a retry attempt. */
export async function resetPaymentPending(checkoutRef: string): Promise<void> {
  await db
    .update(payments)
    .set({ status: "pending", paymentRef: null })
    .where(and(eq(payments.checkoutRef, checkoutRef), ne(payments.status, "succeeded")));
}

/**
 * Mark a user's long-pending checkouts as cancelled (abandoned), so an idle
 * payment stops reading as "pending". A late success still wins via
 * markPaymentSucceeded (which only skips an already-succeeded row).
 * ponytail: cleanup piggybacks on the dashboard read instead of a cron job.
 */
export async function expireStalePendingPayments(
  userId: string,
  olderThanHours: number,
): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  await db
    .update(payments)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.status, "pending"),
        lt(payments.createdAt, cutoff),
      ),
    );
}
