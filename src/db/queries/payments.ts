import "server-only";
import { eq, and, ne } from "drizzle-orm";

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
