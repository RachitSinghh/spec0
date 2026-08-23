# Spec 1 — Dodo Payments migration (one-time project unlock)

**Date:** 2026-08-23
**Status:** Draft, pending review
**Scope:** Replace Razorpay with Dodo Payments for the one-time paid project unlock. No subscription. BYOK is a separate follow-up spec (Spec 2).

## Context

spec0 currently charges a one-time fee (Razorpay, dark-shipped) to unlock a paid project generation once the free monthly quota is used. We are switching the gateway to Dodo Payments (Merchant of Record). Razorpay is not live in production, so this is a full replacement, not a coexistence.

Monetization model this spec serves (decided in brainstorming):

| Tier | What they get | Who pays LLM tokens |
|------|---------------|---------------------|
| Free | 1 spec/month (current models) | spec0 |
| BYOK (Spec 2) | Unlimited, own key | user |
| **Paid one-time (this spec)** | 1 full spec, no key needed | spec0 (price covers cost + margin) |

Subscription and BYOK-behind-paywall were considered and dropped: spec generation is episodic, so a subscription is a leaky bucket, and BYOK is a cost-shifter that should be free and encouraged, not paywalled.

## Dodo product (already created)

- Product: `Spec0 Pro`, **One Time**, ₹349, test id `pdt_0Nm0K8QhgMryy2zY2RfhG`.
- Fulfilment is done by spec0 (webhook -> unlock -> pipeline), NOT by Dodo. So Dodo Credits and Entitlements are unused.
- The same Dodo brand may host other products later, so the webhook must only act on this product's events (see Webhook section).

## Integration approach

Use the official adaptor `@dodopayments/nextjs`, which provides:

- `Checkout(...)` — a route handler that creates a hosted checkout and returns `{ checkout_url }`.
- `Webhooks(...)` — a route handler that verifies the Standard-Webhooks signature and dispatches typed callbacks (`onPaymentSucceeded`, etc).

Reason: the adaptor ships verified signature handling, so we do not hand-roll crypto on a money path. Less code than the Razorpay REST + HMAC path it replaces.

The checkout is redirect-based (hosted page at `checkout.dodopayments.com`), replacing Razorpay's inline modal. The **webhook is the source of truth** for unlocking; a return-side verification covers local dev and latency.

## Data model

No schema migration required.

- `payments` table: keep the existing (stripe-era named) columns, now storing Dodo ids — same reuse pattern Razorpay already used. `stripe_checkout_session_id` holds the Dodo checkout/session id, `stripe_payment_intent_id` holds the Dodo payment id.
- No `users` subscription fields (subscription dropped).

## Environment variables

Already added to `env.ts`, `.env.example`, `.env.local`:

- `DODO_PAYMENTS_API_KEY` — bearer token (test/live).
- `DODO_PAYMENTS_WEBHOOK_KEY` — webhook signing secret.
- `DODO_PAYMENTS_ENVIRONMENT` — `test_mode` | `live_mode` (default `test_mode`).
- `DODO_PROJECT_PRODUCT_ID` — the one-time product id.

Derived, not an env var: `return_url = ${NEXT_PUBLIC_APP_URL}/checkout/success`.

`PROJECT_PRICE_INR` stays, but as a **display-only** value for the paywall UI (the real charge is the Dodo product price).
`ponytail:` display price and Dodo product price are kept in sync by hand; if this drifts often, fetch the product from Dodo instead of reading the env value.

Feature gate: `paymentsEnabled = Boolean(env.DODO_PAYMENTS_API_KEY)` (replaces the Razorpay-key check).

## Components and flow

### 1. `src/lib/dodo.ts` (replaces `src/lib/razorpay.ts`)
- Dodo client init from `DODO_PAYMENTS_API_KEY` + `DODO_PAYMENTS_ENVIRONMENT`.
- `createUnlockCheckout({ projectId, pipelineRunId, userId })` — creates a checkout session for `DODO_PROJECT_PRODUCT_ID` with `metadata: { projectId, pipelineRunId, userId }` and the derived return_url; returns `checkout_url`.
- `unlockPaidProject(...)` — **moved here unchanged** from `razorpay.ts`. Atomically flips the project `payment_pending -> draft` + `billingStatus: paid`, fires the `project/prd.requested` Inngest event, idempotent (first success wins).
- `verifyCheckout(checkoutId)` — fetches the checkout/payment from Dodo, returns paid/unpaid + its metadata. Used by the return-side path for local dev and robustness.

### 2. `src/actions/billing.ts` -> `beginPaidCheckout()`
- Same pre-work as today (pre-create the PRD pipeline run, stash the doc selection, write the pending payment record).
- Calls `createUnlockCheckout(...)`, returns `{ checkoutUrl }` to the client.
- `confirmPayment()` (the old Razorpay callback verifier) is removed; replaced by the return-side verify action below.
- New `confirmCheckout(checkoutId)` server action: calls `verifyCheckout`, and if paid + metadata matches, calls `unlockPaidProject(...)`. Idempotent with the webhook.

### 3. `src/components/intake-form.tsx`
- Remove the `checkout.js` script loader and the inline modal + callback.
- On unlock click: call `beginPaidCheckout()`, then `window.location.href = checkoutUrl`.

### 4. `src/app/(app)/checkout/success/page.tsx` (return page)
- Reads the checkout/payment id from the return query params.
- Calls `confirmCheckout(...)`, then shows a short "processing" state and polls the project status until it flips to `draft`/generating (webhook or the confirm call unlocks it).

### 5. `src/app/api/webhooks/dodo/route.ts` (replaces `api/webhooks/razorpay/`)
- `export const POST = Webhooks({ webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY, onPaymentSucceeded })`.
- `onPaymentSucceeded(payload)`:
  - **Guard (multi-product safety):** ignore unless the payload's product is `DODO_PROJECT_PRODUCT_ID` and `metadata.projectId` is present. Other products on the same Dodo brand are silently ignored.
  - Call `unlockPaidProject({ projectId, ... })`. Idempotent with `confirmCheckout`.
- Signature verification is handled by the adaptor via `DODO_PAYMENTS_WEBHOOK_KEY`.

### 6. Removal (Razorpay)
- Delete `src/lib/razorpay.ts` (after moving `unlockPaidProject`) and `src/app/api/webhooks/razorpay/`.
- Remove Razorpay env vars from `env.ts`, `.env.example`, `.env.local`.
- Remove the `checkout.js` loader and `confirmPayment` callback path from `intake-form.tsx`.
- Leave the unused `stripeCustomerId` column and stripe-era payment column names in place (removing them is a needless migration).

## Error handling

- Webhook signature invalid -> 401 (adaptor default). Malformed -> 400.
- Unknown product / missing metadata -> 200 + no-op (do not error, so Dodo does not retry forever for another product's event).
- `unlockPaidProject` idempotent: webhook and `confirmCheckout` can both fire; first wins, second is a no-op.
- Failed/expired checkout: no unlock; the pending payment record and `payment_pending` project remain, user can retry.

## Testing

- Unit: `unlockPaidProject` idempotency (double-call flips once, fires the Inngest event once).
- Unit: webhook guard ignores a payload whose product id is not `DODO_PROJECT_PRODUCT_ID`.
- Manual (test mode): buy the product -> redirect -> return page -> project unlocks and generation starts; confirm the webhook and the return-side confirm do not double-unlock.

## Out of scope (Spec 2)

Per-user BYOK: encrypted key storage, `mesh.ts` factory taking a per-user provider config, settings toggle, unlimited when a key is present. Gated only on "key present", no plan/subscription check.
