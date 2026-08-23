import { Webhooks } from "@dodopayments/nextjs";

import { env } from "@/lib/env";
import { unlockPaidProject } from "@/lib/dodo";

/**
 * Dodo webhook. The adaptor verifies the signature (DODO_PAYMENTS_WEBHOOK_KEY).
 * The Dodo brand may host other products, so we act only on events whose
 * metadata carries our projectId + userId; everything else is a silent no-op.
 * The unlock is idempotent.
 *
 * Configure: Dodo → Developer → Webhooks → https://<domain>/api/webhooks/dodo,
 * subscribe to payment.succeeded, put the signing secret in
 * DODO_PAYMENTS_WEBHOOK_KEY.
 */
export const POST = Webhooks({
  webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY ?? "",
  onPaymentSucceeded: async (payload) => {
    const data = (payload as { data?: unknown }).data as {
      payment_id?: string;
      metadata?: Record<string, string>;
    };
    const projectId = data?.metadata?.projectId;
    const userId = data?.metadata?.userId;
    const paymentId = data?.payment_id;
    if (!projectId || !userId || !paymentId) return; // not ours / incomplete

    await unlockPaidProject({
      projectId,
      userId,
      checkoutRef: projectId,
      paymentRef: paymentId,
    });
  },
});
