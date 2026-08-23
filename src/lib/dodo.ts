import "server-only";
import DodoPayments from "dodopayments";

import { env } from "@/lib/env";
import { inngest } from "@/inngest/client";
import { markPaymentSucceeded } from "@/db/queries/payments";
import { getProjectForUser, updateProject } from "@/db/queries/projects";
import { getLatestRunForProject } from "@/db/queries/pipeline";
import type { AddonDocType } from "@/types";

/**
 * Dodo Payments (Merchant of Record) one-time unlock. Hosted checkout session
 * via the SDK, webhook-driven idempotent unlock. Prices live in the Dodo
 * product, not here.
 */

function client(): DodoPayments {
  if (!env.DODO_PAYMENTS_API_KEY) {
    throw new Error("Dodo not configured: set DODO_PAYMENTS_API_KEY.");
  }
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });
}

/** Create a hosted checkout session for the one-time project-unlock product. */
export async function createUnlockCheckout(input: {
  projectId: string;
  userId: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  if (!env.DODO_PROJECT_PRODUCT_ID) {
    throw new Error("Dodo product not configured: set DODO_PROJECT_PRODUCT_ID.");
  }
  const session = await client().checkoutSessions.create({
    product_cart: [{ product_id: env.DODO_PROJECT_PRODUCT_ID, quantity: 1 }],
    return_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?project=${input.projectId}`,
    metadata: { projectId: input.projectId, userId: input.userId },
  });
  if (!session.checkout_url) {
    throw new Error("Dodo checkout session returned no URL.");
  }
  return { sessionId: session.session_id, checkoutUrl: session.checkout_url };
}

/**
 * Idempotent unlock: the first successful payment flips the project
 * payment_pending → draft (billing paid) and fires the PRD pipeline with the
 * doc selection stashed on the pre-created run. Safe from both the webhook and
 * any retry — whichever lands first wins.
 */
export async function unlockPaidProject(input: {
  projectId: string;
  userId: string;
  checkoutRef: string;
  paymentRef: string;
}): Promise<{ unlocked: boolean }> {
  const first = await markPaymentSucceeded(input.checkoutRef, input.paymentRef);
  if (!first) return { unlocked: false }; // duplicate — already handled

  const project = await getProjectForUser(input.projectId, input.userId);
  if (!project || project.status !== "payment_pending") return { unlocked: false };

  await updateProject(input.projectId, input.userId, {
    status: "draft",
    billingStatus: "paid",
  });

  // Doc selection was stashed on the pre-created PRD run at checkout time.
  const run = await getLatestRunForProject(input.projectId, "prd");
  const autoDocs = (run?.requestedDocs ?? undefined) as AddonDocType[] | undefined;

  await inngest.send({
    name: "project/prd.requested",
    data: {
      projectId: input.projectId,
      userId: input.userId,
      autoDocs: autoDocs?.length ? autoDocs : undefined,
    },
  });
  return { unlocked: true };
}
