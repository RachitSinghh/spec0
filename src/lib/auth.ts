import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { User } from "@/db/schema";
import { getUserByClerkId, upsertUserFromClerk } from "@/db/queries/users";

/**
 * Auth helpers for Server Actions and Route Handlers (T-010).
 *
 * These wrap Clerk's `auth()` / `currentUser()` and resolve the app's mirrored
 * `users` row (whose `id` everything is keyed off). Access control everywhere
 * else keys off the returned `user.id`.
 */

/** The Clerk id for the current session, or null if unauthenticated. */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * The app user for the current session, or null if unauthenticated / not yet
 * mirrored. Does not create anything — use requireUser() for guaranteed rows.
 */
export async function getCurrentUser(): Promise<User | null> {
  const clerkId = await getClerkUserId();
  if (!clerkId) return null;
  return getUserByClerkId(clerkId);
}

/**
 * Require an authenticated, mirrored user. Redirects to /sign-in if there is no
 * session. If the session exists but the `users` row is missing (e.g. the
 * webhook hasn't fired yet), it is lazily provisioned from the Clerk profile.
 */
export async function requireUser(): Promise<User> {
  const clerkId = await getClerkUserId();
  if (!clerkId) redirect("/sign-in");

  const existing = await getUserByClerkId(clerkId);
  if (existing) return existing;

  // Lazy-provision from the Clerk profile as a fallback.
  const profile = await currentUser();
  const email =
    profile?.primaryEmailAddress?.emailAddress ??
    profile?.emailAddresses?.[0]?.emailAddress ??
    "";
  return upsertUserFromClerk({ clerkId, email });
}
