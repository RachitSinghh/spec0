import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { env } from "@/lib/env";
import { upsertUserFromClerk } from "@/db/queries/users";

/**
 * Clerk → users mirror webhook (T-012, FRONTEND-SPEC B2).
 *
 * Verifies the Svix signature with CLERK_WEBHOOK_SECRET (mandatory — without it
 * this is an open write endpoint). On user.created / user.updated, upserts the
 * `users` row keyed on clerk_id. Returns 200 on success, 401 on a
 * missing/invalid signature.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let evt;
  try {
    // Validate the Svix signature. We pass the secret explicitly (the app
    // standardizes on CLERK_WEBHOOK_SECRET per TECHNICAL-ARCHITECTURE §6).
    evt = await verifyWebhook(req, {
      signingSecret: env.CLERK_WEBHOOK_SECRET,
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, primary_email_address_id } = evt.data;
    const email =
      email_addresses?.find((e) => e.id === primary_email_address_id)
        ?.email_address ??
      email_addresses?.[0]?.email_address ??
      "";
    await upsertUserFromClerk({ clerkId: id, email });
  }

  return new Response("ok", { status: 200 });
}
