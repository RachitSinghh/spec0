import "server-only";
import crypto from "node:crypto";

import { env } from "@/lib/env";
import { inngest } from "@/inngest/client";
import { markPaymentSucceeded } from "@/db/queries/payments";
import { getProjectForUser, updateProject } from "@/db/queries/projects";
import { getLatestRunForProject } from "@/db/queries/pipeline";
import type { AddonDocType } from "@/types";

/**
 * Razorpay one-time payments (E5, Razorpay flavour). Order create via REST
 * (no SDK dep), checkout-callback + webhook signature verification, and the
 * shared idempotent unlock that flips a payment_pending project live.
 */

function keys(): { id: string; secret: string } {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay not configured: set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.");
  }
  return { id: env.RAZORPAY_KEY_ID, secret: env.RAZORPAY_KEY_SECRET };
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
}

/** Create a Razorpay order (amount in paise). */
export async function createOrder(input: {
  amountPaise: number;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { id, secret } = keys();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      notes: input.notes,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Verify the checkout success callback signature (order_id|payment_id HMAC). */
export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", keys().secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return safeEqual(expected, input.signature);
}

/** Verify a webhook payload signature (raw body HMAC with the webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqual(expected, signature);
}

/**
 * Idempotent unlock: first successful payment transition flips the project
 * payment_pending → draft (billing paid) and fires the PRD pipeline with the
 * doc selection stashed on the pre-created run. Safe to call from both the
 * checkout confirm action and the webhook — whichever lands first wins.
 */
export async function unlockPaidProject(input: {
  projectId: string;
  userId: string;
  orderId: string;
  paymentId: string;
}): Promise<{ unlocked: boolean }> {
  const first = await markPaymentSucceeded(input.orderId, input.paymentId);
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
