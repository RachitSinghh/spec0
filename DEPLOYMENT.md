# spec0 — Deployment Guide

How to take spec0 from local dev to production. Target stack: **Vercel** (app) +
**Neon** (Postgres) + **Inngest Cloud** (pipelines) + **Clerk** (auth) +
**AWS S3** (uploads/zip) + **Mesh** (LLM). Stripe/Resend/Sentry are only
needed once Epics E5/E6 are built.

> Current build status: **E0–E4 (internal alpha) done**. E5 (payments) and E6
> (hardening: Sentry, email, cron, abuse) are **not built yet**, so their env
> vars are optional until then.

---

## 0. Local vs production env — the golden rule

- `.env` — real secrets, **gitignored**, used locally.
- `.env.local` — **local-only overrides**, gitignored. Contains things that must
  **NEVER** reach production:
  - `MESH_MOCK=true` — serves fake placeholder content (no real LLM calls)
  - `INNGEST_DEV=1` — points the SDK at the local Inngest Dev Server
  - `DATABASE_URL=...localhost:5544` — the local Docker Postgres
  - dummy `R2_*`, a local `CLERK_WEBHOOK_SECRET`
- `.env.example` — committed template; documents every var.

**On Vercel you do NOT upload any of these files.** You set env vars in the
Vercel dashboard (Project → Settings → Environment Variables). Only the
production values below go there.

---

## 1. Database (Neon) — apply the schema

The app auto-selects the driver: Neon serverless for remote URLs, node-postgres
for `localhost`. Your `.env` already has a real Neon URL. Apply the migration to
it **once** (and again whenever `drizzle/` changes):

```bash
cd /Users/rachit/build/spec0
# temporarily move the local override so migration targets Neon (from .env):
mv .env.local .env.local.bak && npm run db:migrate ; mv .env.local.bak .env.local
```

Verify it created 8 tables (`users`, `projects`, `documents`, `pipeline_runs`,
`pipeline_steps`, `references`, `payments`, `monthly_usage`).

> Migrations use `DIRECT_DATABASE_URL` (unpooled); the running app uses the
> pooled `DATABASE_URL`. Both are already in `.env`.

---

## 2. Auth (Clerk)

Your current keys are **TEST** keys (`pk_test`/`sk_test`) — fine for staging,
but a real production launch wants a **Clerk production instance**:

1. Clerk dashboard → create a **Production** instance, verify your domain.
2. Copy `pk_live_...` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `sk_live_...` →
   `CLERK_SECRET_KEY`.
3. **Webhook**: Clerk → Webhooks → add endpoint
   `https://<your-domain>/api/webhooks/clerk`, subscribe to `user.created` +
   `user.updated`. Copy the signing secret → `CLERK_WEBHOOK_SECRET`
   (currently `whsec_xxx` placeholder — must be replaced).
4. Set `NEXT_PUBLIC_APP_URL=https://<your-domain>` (not localhost).

> Note: the test instance shows a CAPTCHA on signup — normal. Real users solve
> it; automated e2e uses Clerk testing tokens.

---

## 3. Background pipelines (Inngest Cloud)

1. Inngest dashboard → your app → copy the **Event Key** and **Signing Key**.
   ⚠️ In your current `.env` the two look swapped/mislabeled —
   `INNGEST_EVENT_KEY` holds a `signkey-...` value. Re-copy both:
   - `INNGEST_EVENT_KEY` = the Event Key (Events tab)
   - `INNGEST_SIGNING_KEY` = the Signing Key (`signkey-...`)
2. **Do NOT set `INNGEST_DEV`** in production.
3. After deploying, register the app: Inngest dashboard → Apps → Sync new app →
   URL `https://<your-domain>/api/inngest`. It should discover `run-prd-pipeline`
   and `run-addon-pipeline`.

---

## 4. LLM (Mesh)

1. `MESH_API_KEY` is real — keep it. **Remove `MESH_MOCK`** in production (it's
   only in `.env.local`, so as long as you don't copy that file, you're fine).
2. In the Mesh dashboard set a **per-key spend cap** + RPM/RPD/TPM as a hard
   budget backstop (see TECHNICAL-ARCHITECTURE §6.1.5).
3. **Verify the model IDs** on the Mesh "Models" page — `MODEL_*` defaults are
   plausible, not confirmed. Also confirm how Mesh enables **web search** and
   **RAG** and adjust `src/lib/mesh.ts` (`WEB_SEARCH_BODY`, the `/files` +
   `/vector_search` endpoints) to match their real API.

---

## 5. Object storage (AWS S3) — only for image references

Links + zip export work **without** S3. S3 is only needed for UI/UX **image**
uploads. To enable:

1. AWS S3 → create a bucket (e.g. `spec0-uploads-<name>`), note its region.
2. IAM → create a user with `AmazonS3FullAccess` → create an access key →
   fill `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
3. Set `S3_BUCKET` = bucket name and
   `S3_PUBLIC_BASE_URL=https://<bucket>.s3.<region>.amazonaws.com`.
4. **CORS**: bucket → Permissions → CORS, allow `PUT`/`GET` from your app origin
   so the browser can upload directly. (Bucket can stay private — presigned PUT
   is authenticated; the public URL only resolves if you also enable public read.)

---

## 6. Deploy to Vercel

1. Push the repo to GitHub, import into Vercel.
2. Add env vars (Production) in the Vercel dashboard — the real values from §1–§5.
   **Do not add** `MESH_MOCK`, `INNGEST_DEV`, or the local `DATABASE_URL`.
   Set `NEXT_PUBLIC_APP_URL` to the deployed URL.
3. Build command `next build` (default). Deploy.
4. Post-deploy: Clerk webhook (§2.3) + Inngest sync (§3.3) point at the live URL.
5. Smoke test: sign up → new project → PRD generates → add-ons → download zip.

---

## 7. Later (when E5/E6 are built)

- **Stripe** (E5): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PER_PROJECT`; webhook →
  `/api/webhooks/stripe`.
- **Resend** (E6): `RESEND_API_KEY`, `EMAIL_FROM`.
- **Sentry** (E6): `SENTRY_DSN`. **Langfuse** (optional): `LANGFUSE_*`.

---

## 8. Security

- Never commit `.env` / `.env.local` (already gitignored; `.env.example` is the
  only committed one).
- The secrets currently in `.env` were shared in a chat session — for a real
  production launch, **rotate** the Neon password, Clerk secret, Mesh key, and
  Inngest signing key.
- Every webhook verifies its signature — keep those secrets set.
