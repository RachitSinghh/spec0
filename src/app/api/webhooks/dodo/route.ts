import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@dodopayments/nextjs";

import { env } from "@/lib/env";
import { unlockPaidProject } from "@/lib/dodo";
import { markPaymentFailed } from "@/db/queries/payments";

/**
 * Dodo webhook. The adaptor verifies the signature (DODO_PAYMENTS_WEBHOOK_KEY).
 * The Dodo brand may host other products, so we act only on events whose
 * metadata carries our projectId (we set it on the checkout session);
 * everything else is a silent no-op. All state transitions are idempotent.
 *
 * Configure: Dodo → Developer → Webhooks → https://<domain>/api/webhooks/dodo,
 * subscribe to payment.succeeded / failed / cancelled / processing, and put the
 * signing secret in DODO_PAYMENTS_WEBHOOK_KEY.
 */

/** Pull our identifiers off a payment payload (set as checkout metadata). */
function ids(payload: unknown): {
  projectId?: string;
  userId?: string;
  paymentId?: string;
} {
  const data = (payload as { data?: unknown }).data as {
    payment_id?: string;
    metadata?: Record<string, string>;
  };
  return {
    projectId: data?.metadata?.projectId,
    userId: data?.metadata?.userId,
    paymentId: data?.payment_id,
  };
}

// Built only when the signing secret is present — the adaptor throws on an
// empty key, and payments ship dark until the key is configured.
const handler = env.DODO_PAYMENTS_WEBHOOK_KEY
  ? Webhooks({
      webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
      // Success: flip the project live and start the pipeline (idempotent).
      onPaymentSucceeded: async (payload) => {
        const { projectId, userId, paymentId } = ids(payload);
        if (!projectId || !userId || !paymentId) return; // not ours / incomplete
        await unlockPaidProject({
          projectId,
          userId,
          checkoutRef: projectId,
          paymentRef: paymentId,
        });
      },
      // Failed / cancelled: mark the pending payment failed; the project stays
      // payment_pending so the user can retry. No-op once it has succeeded.
      onPaymentFailed: async (payload) => {
        const { projectId } = ids(payload);
        if (projectId) await markPaymentFailed(projectId);
      },
      onPaymentCancelled: async (payload) => {
        const { projectId } = ids(payload);
        if (projectId) await markPaymentFailed(projectId);
      },
      // Processing is a transient pre-terminal state; wait for the terminal event.
      onPaymentProcessing: async () => {
        /* no-op: nothing to persist until success/failure lands */
      },
    })
  : null;

export async function POST(req: NextRequest): Promise<Response> {
  if (!handler) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }
  return handler(req);
}
