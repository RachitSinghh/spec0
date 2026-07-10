import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, type User } from "@/db/schema";

/** Look up the app user mirrored from a Clerk id. */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Insert-or-update the `users` mirror keyed on clerk_id. Used by the Clerk
 * webhook (T-012) and as a lazy fallback in requireUser() so the app is
 * resilient if the webhook hasn't fired yet.
 */
export async function upsertUserFromClerk(input: {
  clerkId: string;
  email: string;
}): Promise<User> {
  const rows = await db
    .insert(users)
    .values({ clerkId: input.clerkId, email: input.email })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email: input.email, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

/** Persist a Stripe customer id on the user (T-051). */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
