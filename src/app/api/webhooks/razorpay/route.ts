import { NextResponse } from "next/server";

import { verifyWebhookSignature, unlockPaidProject } from "@/lib/razorpay";

/**
 * Razorpay webhook (E5). Backstop for the checkout confirm action — unlocks
 * the paid project even if the user closed the tab before the success
 * callback ran. Signature-verified; unlock is idempotent, so a duplicate
 * event (or one racing the confirm action) is a no-op.
 *
 * Configure in the Razorpay dashboard: event `payment.captured`, URL
 * https://<domain>/api/webhooks/razorpay, secret → RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let body: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          notes?: { projectId?: string; userId?: string };
        };
      };
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (body.event === "payment.captured") {
    const entity = body.payload?.payment?.entity;
    const { id: paymentId, order_id: orderId, notes } = entity ?? {};
    if (paymentId && orderId && notes?.projectId && notes?.userId) {
      await unlockPaidProject({
        projectId: notes.projectId,
        userId: notes.userId,
        orderId,
        paymentId,
      });
    }
  }

  // Always 200 for verified events so Razorpay doesn't retry forever.
  return NextResponse.json({ received: true });
}
