# Dodo Payments Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Razorpay with Dodo Payments for the one-time paid project unlock, using Dodo hosted checkout + webhook, with no subscription.

**Architecture:** A server action creates a Dodo checkout session (product id from env, `metadata` carrying projectId/userId), returns its `checkout_url`, and the client redirects to it. A Dodo webhook (`@dodopayments/nextjs` adaptor, signature verified) fires `onPaymentSucceeded`, which reuses the existing idempotent `unlockPaidProject` to flip the project live and start the pipeline. The success return page polls project status until the webhook unlocks it.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle + Neon Postgres, Clerk, Inngest, `dodopayments` SDK, `@dodopayments/nextjs` adaptor. Package manager: **npm**.

## Global Constraints

- Package manager is **npm** (`package-lock.json`); no `packageManager` field.
- **No unit-test framework** is installed (only Playwright). Do NOT add one. Per-task verification is `npm run typecheck` + `npm run lint`, and the money path is verified end-to-end in Dodo **test mode** (Task 7).
- Writing style: no em dashes in any user-facing copy.
- Idempotency key for a project's paid unlock is `checkoutRef = projectId` (one payment row per project via `onConflictDoNothing`).
- The Dodo brand hosts other products, so the webhook must only act on events whose `metadata` carries our `projectId` + `userId`; everything else is a silent no-op.
- Env vars already added to `env.ts` / `.env.example` / `.env.local`: `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT` (`test_mode`|`live_mode`, default `test_mode`), `DODO_PROJECT_PRODUCT_ID`. Test product id: `pdt_0Nm0K8QhgMryy2zY2RfhG`. `NEXT_PUBLIC_APP_URL` is the base for the return URL.
- `PROJECT_PRICE_INR` stays as a display/record-only value (real charge lives in the Dodo product).

---

## File Structure

- Create `src/lib/dodo.ts` — Dodo client, `createUnlockCheckout`, and the moved `unlockPaidProject`.
- Modify `src/actions/billing.ts` — `beginPaidCheckout` uses Dodo; remove `confirmPayment`; add `getProjectStatus`.
- Modify `src/components/intake-form.tsx` — redirect to `checkout_url` instead of the Razorpay modal.
- Create `src/app/(app)/checkout/success/page.tsx` — poll project status, then route to the project.
- Create `src/app/api/webhooks/dodo/route.ts` — Dodo webhook via the adaptor.
- Delete `src/lib/razorpay.ts` and `src/app/api/webhooks/razorpay/route.ts`.
- Modify `src/lib/env.ts`, `.env.example`, `.env.local` — remove Razorpay vars.
- Modify `src/app/(app)/projects/new/page.tsx` — `paymentsEnabled` gate uses the Dodo key.

---

### Task 1: Dodo client library (`src/lib/dodo.ts`)

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/lib/dodo.ts`

**Interfaces:**
- Produces: `createUnlockCheckout({ projectId, userId }): Promise<{ sessionId: string; checkoutUrl: string }>` and `unlockPaidProject({ projectId, userId, checkoutRef, paymentRef }): Promise<{ unlocked: boolean }>`.

- [ ] **Step 1: Install the SDK and adaptor**

Run: `npm install dodopayments @dodopayments/nextjs`
Expected: both added to `dependencies`, `package-lock.json` updated.

- [ ] **Step 2: Create `src/lib/dodo.ts`**

```ts
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
 * Idempotent unlock (moved unchanged from razorpay.ts): first successful
 * payment flips the project payment_pending -> draft (billing paid) and fires
 * the PRD pipeline with the stashed doc selection. Safe from both the webhook
 * and any retry; whichever lands first wins.
 */
export async function unlockPaidProject(input: {
  projectId: string;
  userId: string;
  checkoutRef: string;
  paymentRef: string;
}): Promise<{ unlocked: boolean }> {
  const first = await markPaymentSucceeded(input.checkoutRef, input.paymentRef);
  if (!first) return { unlocked: false };

  const project = await getProjectForUser(input.projectId, input.userId);
  if (!project || project.status !== "payment_pending") return { unlocked: false };

  await updateProject(input.projectId, input.userId, {
    status: "draft",
    billingStatus: "paid",
  });

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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If the SDK's `environment` type rejects the union, cast with `env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode"` (it already is that union) or check the SDK's accepted literal and adjust.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/dodo.ts
git commit -m "feat(billing): add Dodo checkout + unlock lib"
```

---

### Task 2: Billing server actions (`src/actions/billing.ts`)

**Files:**
- Modify: `src/actions/billing.ts`

**Interfaces:**
- Consumes: `createUnlockCheckout` (Task 1).
- Produces: `beginPaidCheckout(...): Promise<{ projectId: string; checkoutUrl: string }>` and `getProjectStatus(projectId: string): Promise<{ status: string }>`.

- [ ] **Step 1: Rewrite the imports and `beginPaidCheckout` return path**

Replace the Razorpay import line:
```ts
import { createUnlockCheckout } from "@/lib/dodo";
```

Change the `CheckoutPayload` interface to:
```ts
export interface CheckoutPayload {
  projectId: string;
  checkoutUrl: string;
}
```

In `beginPaidCheckout`, change the config guard and the order/return block. Replace the `if (!env.RAZORPAY_KEY_ID)` guard with:
```ts
  if (!env.DODO_PAYMENTS_API_KEY) throw new Error("Payments are not configured.");
```

Replace the amount/order/pending/return block (current lines ~63-83) with:
```ts
  const { checkoutUrl } = await createUnlockCheckout({
    projectId: project.id,
    userId: user.id,
  });

  await insertPendingPayment({
    userId: user.id,
    projectId: project.id,
    checkoutRef: project.id, // one payment row per project
    amountCents: env.PROJECT_PRICE_INR * 100,
    currency: "inr",
  });

  return { projectId: project.id, checkoutUrl };
```

- [ ] **Step 2: Delete `confirmPayment` and add `getProjectStatus`**

Remove the entire `confirmPayment` function (current lines ~86-112). Append:
```ts
/** Poll target for the checkout return page. */
export async function getProjectStatus(
  projectId: string,
): Promise<{ status: string }> {
  const user = await requireUser();
  const project = await getProjectForUser(projectId, user.id);
  return { status: project?.status ?? "unknown" };
}
```

Add `getProjectForUser` to the projects-queries import at the top:
```ts
import { createProject as createProjectRow, getProjectForUser } from "@/db/queries/projects";
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no references to `createOrder` / `verifyCheckoutSignature` / `confirmPayment` remain.

- [ ] **Step 4: Commit**

```bash
git add src/actions/billing.ts
git commit -m "feat(billing): Dodo checkout in beginPaidCheckout, add getProjectStatus"
```

---

### Task 3: Intake form redirect (`src/components/intake-form.tsx`)

**Files:**
- Modify: `src/components/intake-form.tsx`

**Interfaces:**
- Consumes: `beginPaidCheckout` (Task 2).

- [ ] **Step 1: Remove Razorpay client plumbing**

Delete the `confirmPayment` import (keep `beginPaidCheckout`), the `declare global { ... Razorpay ... }` block (lines ~23-27), and the `loadRazorpay` function (lines ~29-39).

- [ ] **Step 2: Replace `onUnlock` with a redirect**

```ts
  // Over-quota purchase: create a Dodo checkout session and redirect to it.
  async function onUnlock() {
    setPending(true);
    setError(null);
    try {
      const selectedDocs = DOC_OPTIONS.filter((d) => docs.has(d.key)).map((d) => d.key);
      const { checkoutUrl } = await beginPaidCheckout({
        ideaText: idea,
        ideaMeta: { problem, audience, scope },
        docs: selectedDocs,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setPending(false);
    }
  }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no `window.Razorpay` references remain.

- [ ] **Step 4: Commit**

```bash
git add src/components/intake-form.tsx
git commit -m "feat(billing): redirect to Dodo hosted checkout"
```

---

### Task 4: Checkout success page (`src/app/(app)/checkout/success/page.tsx`)

**Files:**
- Create: `src/app/(app)/checkout/success/page.tsx`

**Interfaces:**
- Consumes: `getProjectStatus` (Task 2).

- [ ] **Step 1: Create the page (client, polls status)**

```tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getProjectStatus } from "@/actions/billing";

/**
 * Post-checkout return page. Dodo redirects here after payment; the webhook
 * flips the project live. Poll status until it leaves payment_pending, then
 * route to the project. Falls back to a message if the webhook is slow.
 */
export default function CheckoutSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("project");
  const [slow, setSlow] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const { status } = await getProjectStatus(projectId);
      if (status && status !== "payment_pending" && status !== "unknown") {
        clearInterval(timer);
        router.replace(`/projects/${projectId}`);
      } else if (tries >= 20) {
        clearInterval(timer);
        setSlow(true);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [projectId, router]);

  return (
    <div className="flex max-w-reading flex-col gap-sp-3 p-sp-4">
      <p className="font-mono text-small text-content-secondary">
        {slow
          ? "Payment received. Generation is taking a moment to start. Open your project from the dashboard shortly."
          : "Payment received. Starting your spec…"}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/checkout/success/page.tsx"
git commit -m "feat(billing): checkout success return page"
```

---

### Task 5: Dodo webhook (`src/app/api/webhooks/dodo/route.ts`)

**Files:**
- Create: `src/app/api/webhooks/dodo/route.ts`
- Delete: `src/app/api/webhooks/razorpay/route.ts`

**Interfaces:**
- Consumes: `unlockPaidProject` (Task 1).

- [ ] **Step 1: Create the webhook route**

```ts
import { Webhooks } from "@dodopayments/nextjs";

import { env } from "@/lib/env";
import { unlockPaidProject } from "@/lib/dodo";

/**
 * Dodo webhook. Signature is verified by the adaptor (DODO_PAYMENTS_WEBHOOK_KEY).
 * The brand may host other products, so we act only on events whose metadata
 * carries our projectId + userId; everything else is a silent no-op. Unlock is
 * idempotent.
 *
 * Configure: Dodo -> Developer -> Webhooks -> https://<domain>/api/webhooks/dodo,
 * subscribe to payment.succeeded, put the signing secret in DODO_PAYMENTS_WEBHOOK_KEY.
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
```

- [ ] **Step 2: Delete the Razorpay webhook**

Run: `git rm src/app/api/webhooks/razorpay/route.ts`

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. If the adaptor exports a different callback name than `onPaymentSucceeded`, confirm against `node_modules/@dodopayments/nextjs` types and adjust; the payload field access is defensively cast so it will not break typing.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/webhooks/dodo/route.ts"
git commit -m "feat(billing): Dodo webhook, remove Razorpay webhook"
```

---

### Task 6: Remove Razorpay, retarget the gate

**Files:**
- Delete: `src/lib/razorpay.ts`
- Modify: `src/lib/env.ts`, `.env.example`, `.env.local`
- Modify: `src/app/(app)/projects/new/page.tsx`

- [ ] **Step 1: Delete the Razorpay lib**

Run: `git rm src/lib/razorpay.ts`

- [ ] **Step 2: Remove Razorpay env vars**

In `src/lib/env.ts`, delete `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (keep `PROJECT_PRICE_INR` for display/record). Update the section comment. Remove the matching lines from `.env.example` and `.env.local`.

- [ ] **Step 3: Retarget the payments gate**

In `src/app/(app)/projects/new/page.tsx` (line ~8), change:
```ts
const paymentsEnabled = Boolean(env.DODO_PAYMENTS_API_KEY);
```

- [ ] **Step 4: Grep for stragglers**

Run: `grep -rn -i "razorpay" src/`
Expected: no matches.

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(billing): remove Razorpay, gate payments on Dodo key"
```

---

### Task 7: Test-mode end-to-end verification (the money-path check)

**Files:** none (manual).

- [ ] **Step 1: Expose the webhook locally**

Run: `ngrok http 3000` (or any HTTPS tunnel). In Dodo (test mode) -> Developer -> Webhooks, add `https://<tunnel>/api/webhooks/dodo`, subscribe to `payment.succeeded`, copy the signing secret into `DODO_PAYMENTS_WEBHOOK_KEY` in `.env.local`, restart dev.

- [ ] **Step 2: Run the paid flow**

Start the app, exhaust the free quota (or force the paywall), click UNLOCK, complete Dodo test-mode payment, confirm the redirect lands on `/checkout/success` and then routes to `/projects/<id>` with the pipeline running.

- [ ] **Step 3: Verify idempotency + isolation**

Confirm the project unlocked exactly once (one `payments` row `succeeded`, one `project/prd.requested` event). Re-deliver the webhook from the Dodo dashboard and confirm it is a no-op (no second pipeline run).

- [ ] **Step 4: Commit any config notes**

```bash
git add -A && git commit -m "docs(billing): note Dodo test-mode webhook setup" || true
```

---

## Self-Review

- **Spec coverage:** package/adaptor (Task 1), data model reuse via `checkoutRef=projectId` (Tasks 1-2), env (Task 6), checkout flow (Tasks 2-3), return page (Task 4), webhook + multi-product guard (Task 5), Razorpay removal (Tasks 5-6), error handling (defensive returns in unlock + webhook), test-mode verification (Task 7). BYOK remains out of scope.
- **Placeholder scan:** none; every code step is concrete.
- **Type consistency:** `unlockPaidProject` uses `{ checkoutRef, paymentRef }` in Tasks 1/5; `beginPaidCheckout`/`getProjectStatus` signatures match their consumers in Tasks 3/4.
- **Deviation from spec:** local dev uses a webhook tunnel rather than a separate return-side verify action (simpler, fewer moving parts). Spec's "return-side verify" is replaced by "poll status + webhook is the single unlock path".
