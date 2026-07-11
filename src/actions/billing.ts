"use server";

import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createOrder, verifyCheckoutSignature, unlockPaidProject } from "@/lib/razorpay";
import { createProject as createProjectRow } from "@/db/queries/projects";
import { createPipelineRun, seedPipelineSteps } from "@/db/queries/pipeline";
import { insertPendingPayment } from "@/db/queries/payments";
import { ADDON_DOC_TYPES, type AddonDocType } from "@/types";

const PRD_STEPS = [
  { agent: "research" as const, orderIndex: 0 },
  { agent: "draft" as const, orderIndex: 1 },
  { agent: "refine" as const, orderIndex: 2 },
];

export interface CheckoutPayload {
  projectId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
}

/**
 * Over-quota purchase (E5): create the project in `payment_pending`, stash the
 * doc selection on a pre-created PRD run, create a Razorpay order, and hand
 * the client what Checkout needs. Nothing generates until payment lands.
 */
export async function beginPaidCheckout(input: {
  ideaText: string;
  ideaMeta?: { problem?: string; audience?: string; scope?: string };
  docs?: AddonDocType[];
}): Promise<CheckoutPayload> {
  const user = await requireUser();
  const ideaText = input.ideaText?.trim();
  if (!ideaText) throw new Error("Idea text is required.");
  if (!env.RAZORPAY_KEY_ID) throw new Error("Payments are not configured.");

  const title = ideaText.split("\n")[0].slice(0, 80);
  const meta = Object.fromEntries(
    Object.entries(input.ideaMeta ?? {}).filter(([, v]) => v?.trim()),
  ) as Record<string, string>;

  const project = await createProjectRow({
    userId: user.id,
    ideaText,
    ideaMeta: Object.keys(meta).length ? meta : undefined,
    title,
    status: "payment_pending",
  });

  // Pre-create the PRD run: steps stay pending; requestedDocs carries the
  // intake doc selection across the payment boundary for the auto-chain.
  const docs = ADDON_DOC_TYPES.filter((d) => input.docs?.includes(d));
  const run = await createPipelineRun({
    projectId: project.id,
    kind: "prd",
    requestedDocs: docs.length ? docs : undefined,
  });
  await seedPipelineSteps(run.id, PRD_STEPS);

  const amountPaise = env.PROJECT_PRICE_INR * 100;
  const order = await createOrder({
    amountPaise,
    notes: { projectId: project.id, userId: user.id },
  });

  await insertPendingPayment({
    userId: user.id,
    projectId: project.id,
    checkoutRef: order.id,
    amountCents: amountPaise,
    currency: "inr",
  });

  return {
    projectId: project.id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
  };
}

/**
 * Checkout success callback: verify the Razorpay signature server-side, then
 * unlock. The webhook performs the same unlock as a backstop — both are
 * idempotent, whichever lands first wins.
 */
export async function confirmPayment(input: {
  projectId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const valid = verifyCheckoutSignature({
    orderId: input.orderId,
    paymentId: input.paymentId,
    signature: input.signature,
  });
  if (!valid) throw new Error("Payment verification failed.");

  await unlockPaidProject({
    projectId: input.projectId,
    userId: user.id,
    orderId: input.orderId,
    paymentId: input.paymentId,
  });
  return { ok: true };
}
