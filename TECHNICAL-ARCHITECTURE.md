# Technical Architecture Document

## Spec0 — Idea → PRD → Docs Package (Multi-Agent Pipeline SaaS)

| Field | Detail |
|---|---|
| Document Owner | Founder / Eng |
| Status | Draft v1.0 |
| Last Updated | July 10, 2026 |
| Source | Derived from PRD.md (Draft v1.0) |
| Audience | Whoever builds v1 (you + AI coding tools) |

---

## 0. How to Read This Document

This is the buildable blueprint for the product described in `PRD.md`. It makes **opinionated, decisive choices** so you can start building today, and flags the few places where an alternative is genuinely worth considering. Sections:

1. Architectural shape (the one decision everything else hangs off)
2. Recommended tech stack + reasoning
3. System architecture & request/pipeline flow
4. File & folder structure
5. Database schema (plain English + field-level detail)
6. Environment variables & configuration
7. Cost, latency & abuse notes (the PRD's open risks, answered)
8. Build order / milestones

---

## 1. The One Decision That Shapes Everything: Durable Orchestration

The product is **not** a normal CRUD web app. Its core is a pipeline of up to **7 sequential LLM calls** (Research → Draft → Refine, then optionally Technical → Security → UI/UX → Tickets), some using web search, taking **several minutes total**, where each step depends on the output of the previous one, and any step can fail or need retrying.

A naive implementation (a single long HTTP request, or a `for` loop inside a serverless function) breaks on all three of the PRD's named risks — **cost, latency, and quality consistency** — because:

- Serverless functions have execution time limits (Vercel: 60s–300s). A 5-minute pipeline will time out.
- If step 5 of 7 fails, you don't want to re-run and re-pay for steps 1–4.
- The user needs **live per-step status** ("Researching…", "Drafting…"), which requires the pipeline's progress to be durably readable from outside the process.

**Decision: use a durable step-function orchestrator (Inngest).** Each agent is a `step.run(...)`. Steps are **memoized** (a completed step is never re-executed on retry), automatically retried on transient failure, and each step boundary writes status to the DB that the frontend polls. This single choice solves latency, partial-failure cost, and live status in one stroke, and keeps the whole thing running on serverless (no long-lived servers to manage).

Everything else in the stack is chosen to be boring, well-supported, and compatible with this core.

---

## 2. Recommended Tech Stack

| Layer | Choice | Why this | Reasonable alternative |
|---|---|---|---|
| **Language** | TypeScript (end-to-end) | One language for UI, API, agents, and DB types. Type safety across the LLM→DB→UI boundary is where most bugs in this kind of app hide. | — |
| **Framework** | Next.js 15 (App Router) | Frontend + API in one deploy. Server Components for the doc viewer, Server Actions for mutations, Route Handlers for webhooks/SSE. Vercel-native. | Remix (fine, smaller AI ecosystem) |
| **UI** | Tailwind CSS + shadcn/ui | shadcn gives you owned, un-lock-in components (dialogs, forms, toasts) you'll need for intake, add-on selection, and dashboards. Fast to build, easy to restyle. | Chakra / Mantine |
| **Markdown render/edit** | `react-markdown` + `remark-gfm` (view), Milkdown or a plain `<textarea>` + preview (edit) | v1 only needs whole-doc edit, so a textarea-with-live-preview is enough and dead simple. Upgrade to a WYSIWYG later. | TipTap (heavier) |
| **Auth** | Clerk | Email + OAuth out of the box, prebuilt UI, bot/abuse signals (helps the free-tier-abuse risk), and a clean `userId` you key everything off. Fastest path to a real login. | Supabase Auth or Auth.js (cheaper, more wiring) |
| **Database** | PostgreSQL on Neon | Relational data (users→projects→docs) with clear foreign keys is exactly Postgres's job. Neon is serverless (scales to zero, cheap early), supports branching for safe migrations, and has fast cold starts suited to Vercel. | Supabase Postgres (if you want DB+auth+storage in one vendor) |
| **ORM / query** | Drizzle ORM | Type-safe SQL with zero runtime magic, great serverless cold-start profile, and schema-as-TypeScript that doubles as your source of truth. | Prisma (nicer DX, heavier cold starts) |
| **Background orchestration** | **Inngest** | The keystone (see §1). Durable multi-step functions, per-step retries, step memoization, concurrency/rate limiting, and event-driven triggers — all serverless. Purpose-built for exactly this "chain of AI steps" pattern. | Trigger.dev (very comparable; pick on DX preference) |
| **LLM gateway** | **Mesh API** (`api.meshapi.ai/v1`) | **This is your model layer.** One OpenAI-compatible endpoint + one `rsk_` key routes to 1000+ models (Claude Opus 4.8 / Sonnet 5 / Fable 5, GPT-5.5, Gemini Flash, …). It also bundles web search, RAG, audit logs, spend caps, and <100ms failover — collapsing four vendors from my first draft into one. See §2.2. | Direct Anthropic/OpenAI SDKs (loses routing, failover, unified logging) |
| **LLM SDK** | Vercel AI SDK via its OpenAI-compatible provider, pointed at Mesh | Because Mesh is OpenAI-compatible, you point the AI SDK's `baseURL` at Mesh and get `generateText`/`streamText`, structured output, and tool-calling helpers with per-agent model swapping — over Mesh's whole model catalog. | Plain `openai` SDK with `baseURL` override (also works; fewer helpers) |
| **Web search (Research agent)** | Mesh API built-in web search | The Research agent's search quality directly gates PRD quality (PRD §11). Mesh exposes web search through the same gateway — no separate Tavily/Exa account, key, or billing. | Tavily/Exa if you outgrow Mesh's search |
| **Reference grounding (UI/UX)** | Mesh API RAG files | Uploaded reference docs (PDF/DOCX/CSV) can be dropped into Mesh RAG — it chunks, embeds, indexes, and serves grounded answers **with citations**, so the UI/UX agent cites real reference material instead of you building an embedding pipeline. | Pass references inline as context (fine for small/link-only refs) |
| **Object storage** | Cloudflare R2 | Stores UI/UX reference **image** uploads and generated `.zip` files. R2 has **no egress fees** — important because users download zips. S3-compatible API. (Text/doc references can go to Mesh RAG instead.) | AWS S3, Supabase Storage |
| **Payments** | Stripe (Checkout, one-time) | PRD §10 is pay-per-project (one-time charge), not subscriptions. Stripe Checkout in one-time mode + webhooks is the least-code correct path. Stores a `customerId` per user for later subscription upgrade. | Lemon Squeezy (merchant-of-record; handles global tax for you) |
| **Zip generation** | `archiver` (server-side, streamed) | Build the `.zip` on demand from stored Markdown, stream to R2 or straight to the client. No client-side memory limits. | `jszip` |
| **LLM cost & usage tracking** | Mesh audit logs + per-key spend caps | Mesh already captures every request, token, latency, and dollar live, and enforces spend caps / RPM / RPD / TPM per key — this directly answers the PRD's cost risk with no extra tooling. | — |
| **Prompt-eval tracing** | Langfuse (optional, recommended) | Mesh logs give you *cost/latency*; Langfuse gives you *quality* — step-level traces and eval scoring against your test-idea suite (PRD §11). Keep it if you're serious about prompt iteration; skip it for a pure hackathon build. | Rely on Mesh logs alone for the hackathon |
| **Error monitoring** | Sentry | Standard app-error + performance monitoring across Next.js and Inngest functions. | — |
| **Email** | Resend | Transactional email (receipts, "your docs are ready" if a pipeline runs unattended). React Email templates. | Postmark |
| **Hosting** | Vercel (app) + Inngest Cloud + Neon + R2 | All serverless, all free-tier-friendly, all integrate with Next.js with minimal ops. You run **zero servers**. | Fly.io / Railway if you outgrow serverless |

### 2.1 Vendor-count note (important for a solo builder)

Using Mesh API already collapses the AI side (model access + web search + RAG + LLM cost tracking + failover) into **one** vendor. On the app side, the biggest remaining consolidation is:

> Swap **Clerk + Neon + R2** for **Supabase** (Auth + Postgres + Storage in one vendor).

You'd keep Drizzle (over Supabase's Postgres), Inngest, Stripe, and Mesh. Trade-off: Supabase Auth is slightly more wiring than Clerk, and you'd enforce access control in your server layer rather than leaning on Clerk's polish. With that swap your entire stack is **Vercel + Supabase + Inngest + Stripe + Mesh** — five vendors — which is a very lean footprint for a hackathon build.

### 2.2 Mesh API — how each product need maps to a Mesh feature

Mesh is an OpenAI-compatible gateway (`https://api.meshapi.ai/v1`, `Authorization: Bearer rsk_...`). Because it's a drop-in OpenAI endpoint, you integrate it by pointing your SDK's `baseURL` at Mesh — no bespoke client. Here's how it services this specific app:

| Product need (from PRD) | Mesh feature | How you use it |
|---|---|---|
| Run 7 different agents, each best-suited to a different model | **Auto-routing + 1000+ models** | Either name an explicit model per agent (provider-prefixed, e.g. `anthropic/claude-opus-4-8` for Refine, `anthropic/claude-sonnet-5` for drafting, a cheap fast model like `google/gemini-flash` for light steps) or let Mesh auto-route ("simple → Gemini Flash, complex reasoning → Claude"). |
| Research agent must search the web (PRD §7) | **Web search** | Enable Mesh web search on the research call; no separate search vendor/key. |
| Structured research brief & ticket list | **Structured output + tool calling** (OpenAI-compatible) | Use the AI SDK's structured-output/JSON-schema mode over Mesh so the research brief and tickets come back as validated objects, not free text to parse. |
| UI/UX references (PRD §5.1) | **RAG files** | Upload reference PDFs/DOCX/CSV to Mesh (Init Upload → Trigger Embedding → Vector Search); the UI/UX agent retrieves grounded, cited snippets. Reference *images* still go to R2 for multimodal passing. |
| Cost per generation is a launch risk (PRD §11) | **Audit logs + per-key spend caps + RPM/RPD/TPM** | Every call's tokens/latency/cost is logged; set a **spend cap per API key** as a hard budget guardrail. Read Mesh usage to price the paid tier against real cost-per-project. |
| A 7-call pipeline must not fail because one provider hiccups | **Smart failover (<100ms)** | Mesh reroutes within a single call automatically; Inngest handles durability *across* steps. The two are complementary, not redundant. |
| Prompt templates (optional) | **Prompt templates** | You *can* store agent system prompts as Mesh templates, but **keep them as versioned code in `agents/prompts/`** (git history matters for prompt iteration). Templates are a nice-to-have, not the source of truth. |

**Key architectural implication:** create **separate Mesh API keys** for logical concerns — e.g. one key per environment (dev/prod), and consider one key scoped with a spend cap for free-tier traffic vs. paid — so Mesh's per-key spend caps and logs give you clean cost attribution and a built-in abuse ceiling.

---

## 3. System Architecture & Flow

### 3.1 Components

```
                          ┌───────────────────────────────────────┐
                          │            Vercel (Next.js)            │
  Browser ───────────────▶│  • React UI (RSC + client components)  │
   (user)   HTTP / SSE    │  • Server Actions (mutations)          │
                          │  • Route Handlers (/api/*, webhooks)   │
                          └───────┬───────────────┬────────────────┘
                                  │               │
                 emit event       │               │  read/write
              "project/created"   │               ▼
                                  │        ┌───────────────┐
                                  │        │  Neon Postgres │◀───── Drizzle
                                  │        │  (source of    │
                                  │        │   truth)       │
                                  ▼        └───────▲────────┘
                          ┌───────────────┐        │ status writes per step
                          │    Inngest    │────────┘
                          │  (durable     │──▶ Mesh API (api.meshapi.ai/v1)
                          │   pipeline)   │      • 1000+ models · web search
                          │  step.run()   │      • RAG files · logs · spend caps
                          └───────┬───────┘      • <100ms failover · (opt) Langfuse
                                  │ store artifacts / zip
                                  ▼
                          ┌───────────────┐        ┌───────────────┐
                          │ Cloudflare R2 │        │    Stripe     │
                          │ (uploads,zip) │        │ (one-time pay)│
                          └───────────────┘        └───────────────┘
```

### 3.2 The PRD pipeline, step by step (what actually happens)

1. User submits the idea intake form. A **Server Action** checks quota (see §3.4), creates a `project` row, creates a `pipeline_run` row (`kind = 'prd'`) with its `pipeline_steps` seeded as `pending`, and emits an Inngest event `project/prd.requested`.
2. The Inngest function `runPrdPipeline` picks up the event and runs three memoized steps:
   - `step.run("research")` → Mesh call with web search enabled → writes a `documents` row (`type = 'research_brief'`, `is_user_facing = false`), marks the research `pipeline_step` `complete`.
   - `step.run("draft")` → reads the research brief → writes the draft PRD (`type = 'prd'`).
   - `step.run("refine")` → reads the draft → overwrites/updates the PRD document with the final version, marks run `complete`.
3. Throughout, the frontend polls `GET /api/projects/:id/status` (every ~2s) — or subscribes to an SSE endpoint — which just reads `pipeline_steps` from Postgres and returns the current stage. **The DB is the single source of truth for status; Inngest just writes to it.**
4. On completion, the PRD viewer renders the finished Markdown. User edits inline (Server Action updates `documents.content`) or hits Regenerate (emits `project/prd.requested` again with optional `notes`, which overwrites — no version history in v1 per PRD §9).
5. Add-on selection screen: user checks any subset of {Technical, Security, UI/UX, Tickets} and optionally uploads UI/UX references (uploaded directly to R2 via presigned URL, recorded in `references`). Submitting emits `project/addons.requested` with the selected set.
6. The Inngest function `runAddonPipeline` runs the selected docs **in fixed order** (Technical → Security → UI/UX → Tickets), each `step.run` reading the PRD + all previously generated docs in this run as context. Each produces a `documents` row.
7. Zip export: `GET /api/projects/:id/download` streams an `archiver` zip of all `is_user_facing` documents (as `PRD.md`, `technical-documentation.md`, etc.) — either freshly built or cached in R2.

### 3.3 Why the DB-as-status-board pattern

You could push status over websockets from Inngest, but that couples two serverless systems and is fragile. Instead: **Inngest writes step status to Postgres; the browser polls a thin status endpoint.** Simple, debuggable, survives reconnects, and works identically whether the user is watching or closed the tab and came back (the "generate all, review at the end" toggle in PRD §6.8 becomes trivial — it's the same pipeline, the UI just chooses when to look).

### 3.4 Quota & paywall enforcement (PRD §10)

Quota is enforced **server-side at project creation**, never trusted from the client:

- On "New Project", the Server Action counts the user's projects created in the current calendar month (or reads a `monthly_usage` counter row — see schema).
- If `count < freeLimit (1)` → proceed.
- Else → return a "payment required" state; the client opens **Stripe Checkout** (one-time). On the `checkout.session.completed` webhook, record a `payment` row tied to a **pre-created `project` in `payment_pending` status**, then flip it to allow the pipeline. (Create the project row first in a `payment_pending` state so the webhook has something to attach to and you never lose a paid-for project.)

---

## 4. File & Folder Structure

```
spec0/
├── PRD.md
├── TECHNICAL-ARCHITECTURE.md
├── .env.local                      # not committed
├── .env.example                    # committed; documents every var
├── package.json
├── next.config.ts
├── drizzle.config.ts               # Drizzle Kit migration config
├── tailwind.config.ts
├── tsconfig.json
│
├── drizzle/                        # generated SQL migrations (committed)
│   └── 0000_init.sql
│
├── public/                         # static assets, favicon, og image
│
└── src/
    ├── app/                        # Next.js App Router
    │   ├── (marketing)/            # public landing, pricing
    │   │   └── page.tsx
    │   ├── (auth)/                 # Clerk sign-in / sign-up routes
    │   │   ├── sign-in/[[...rest]]/page.tsx
    │   │   └── sign-up/[[...rest]]/page.tsx
    │   ├── (app)/                  # authenticated app shell
    │   │   ├── layout.tsx          # requires auth, renders nav
    │   │   ├── dashboard/
    │   │   │   └── page.tsx         # project list + usage counter
    │   │   └── projects/
    │   │       ├── new/
    │   │       │   └── page.tsx     # idea intake form
    │   │       └── [projectId]/
    │   │           ├── page.tsx           # pipeline status + PRD viewer
    │   │           ├── addons/page.tsx    # add-on selection screen
    │   │           └── docs/[docType]/page.tsx  # per-doc view/edit
    │   │
    │   ├── api/                     # Route Handlers
    │   │   ├── inngest/route.ts             # Inngest serve endpoint
    │   │   ├── webhooks/
    │   │   │   ├── stripe/route.ts          # Stripe webhook receiver
    │   │   │   └── clerk/route.ts           # user.created → mirror to DB
    │   │   ├── projects/[projectId]/
    │   │   │   ├── status/route.ts          # poll/SSE pipeline status
    │   │   │   └── download/route.ts        # stream zip export
    │   │   └── uploads/presign/route.ts     # R2 presigned upload URL
    │   │
    │   ├── layout.tsx               # root layout (ClerkProvider, theme)
    │   └── globals.css
    │
    ├── actions/                    # Server Actions (mutations)
    │   ├── projects.ts             # createProject, editDocument, regenerate
    │   ├── addons.ts               # requestAddons
    │   └── billing.ts              # createCheckoutSession
    │
    ├── inngest/                    # durable orchestration
    │   ├── client.ts               # Inngest client + event types
    │   └── functions/
    │       ├── run-prd-pipeline.ts     # research → draft → refine
    │       └── run-addon-pipeline.ts   # technical → security → uiux → tickets
    │
    ├── agents/                     # the product's brain — keep isolated & testable
    │   ├── types.ts                # AgentContext, AgentResult contracts
    │   ├── run-agent.ts            # shared runner: Mesh call (model/search/RAG per agent) + optional Langfuse trace
    │   ├── prompts/                # system prompts, versioned as files
    │   │   ├── research.ts
    │   │   ├── draft.ts
    │   │   ├── refine.ts
    │   │   ├── technical.ts
    │   │   ├── security.ts
    │   │   ├── ui-ux.ts
    │   │   └── tickets.ts
    │   └── config.ts               # which model + settings per agent
    │
    ├── db/
    │   ├── index.ts                # Drizzle client (Neon)
    │   ├── schema.ts               # all tables (source of truth)
    │   └── queries/                # reusable typed queries
    │       ├── projects.ts
    │       ├── documents.ts
    │       └── usage.ts
    │
    ├── lib/
    │   ├── auth.ts                 # Clerk helpers, getCurrentUser
    │   ├── mesh.ts                 # Mesh client (AI SDK w/ baseURL=api.meshapi.ai/v1), RAG upload/search helpers
    │   ├── stripe.ts               # Stripe client + helpers
    │   ├── storage.ts              # R2 client, presign, put/get
    │   ├── zip.ts                  # archiver-based zip builder
    │   ├── quota.ts                # monthly quota check logic
    │   └── markdown.ts             # doc filename mapping, sanitising
    │
    ├── components/
    │   ├── ui/                     # shadcn components
    │   ├── intake-form.tsx
    │   ├── pipeline-status.tsx     # live step indicator (polls status API)
    │   ├── doc-viewer.tsx
    │   ├── doc-editor.tsx
    │   ├── addon-selector.tsx
    │   └── project-card.tsx
    │
    └── types/
        └── index.ts                # shared app types (DocType enum, etc.)
```

**Design principles baked into this layout:**

- **`agents/` is a self-contained module** with no Next.js imports. The pipeline logic can be unit-tested and run against your "test-idea suite" (PRD §11) without spinning up the web app. Prompts are code files so they're versioned in git — critical for the prompt-iteration risk.
- **`inngest/functions/` are thin.** They orchestrate steps and write status; the actual "what does this agent do" lives in `agents/`. This separation lets you swap orchestrators (Inngest ↔ Trigger.dev) without touching agent logic.
- **`db/schema.ts` is the single source of truth** for data shape; Drizzle generates both migrations and TypeScript types from it.
- **Mutations go through `actions/` (Server Actions); reads go through Server Components + `db/queries/`.** Webhooks and streaming go through `api/` Route Handlers because they need raw request/response control.

---

## 5. Database Schema

PostgreSQL. All IDs are UUIDs (or `text` if you prefer Clerk-style IDs). All tables carry `created_at` / `updated_at` timestamps (omitted below for brevity except where meaningful). Below, each table is explained in plain English first, then its fields.

### 5.1 `users`
**Plain English:** One row per account. Clerk owns authentication; this table is a **mirror** of the Clerk user plus the app-specific fields Clerk doesn't hold (Stripe customer id, plan). Created/updated by a Clerk webhook. Everything the user owns hangs off this row.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Internal id. |
| `clerk_id` | text (unique) | The Clerk user id; how you look them up from a session. |
| `email` | text | Mirrored from Clerk for display / receipts. |
| `stripe_customer_id` | text (nullable) | Set on first payment; reused for future charges. |
| `plan` | enum (`free`, `paid`) | v1 is effectively always `free` with per-project charges; field reserved for future subscription tier. |
| `created_at` / `updated_at` | timestamptz | |

*(If you choose Supabase Auth instead of Clerk, `id` = the Supabase `auth.users` id and you drop `clerk_id`.)*

### 5.2 `projects`
**Plain English:** One row per idea a user turns into docs. This is the unit of monetization (one free per month; pay per extra). Holds the original idea text and overall status. Owns many documents, pipeline runs, and references.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users.id) | Owner. Indexed. |
| `title` | text | Auto-derived from the idea or PRD title; user-editable. |
| `idea_text` | text | The raw idea from the intake form. |
| `idea_meta` | jsonb (nullable) | Optional structured intake prompts (problem, audience, scope). |
| `status` | enum | `payment_pending`, `draft` (PRD generating/ready), `addons_pending`, `complete`, `failed`. |
| `billing_status` | enum (`free`, `paid`) | Whether this specific project was free-tier or paid-for. |
| `created_at` / `updated_at` | timestamptz | `created_at` is what the monthly quota counts. |

### 5.3 `documents`
**Plain English:** One row per generated artifact within a project — including internal ones (the research brief). This is where all Markdown output lives. Because v1 has **no version history** (PRD §9), regeneration **overwrites** `content` in place; there is at most one row per `(project_id, type)`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | uuid (FK → projects.id) | Indexed. |
| `type` | enum | `research_brief`, `prd`, `technical`, `security`, `ui_ux`, `tickets`. |
| `content` | text | The Markdown body. |
| `is_user_facing` | boolean | `false` for `research_brief` (internal handoff artifact, not exported). |
| `status` | enum | `pending`, `generating`, `ready`, `failed`. |
| `last_edited_by_user` | boolean | True if the user hand-edited after generation (so a later regenerate can warn about overwriting). |
| `updated_at` | timestamptz | |
| | | **Unique constraint:** `(project_id, type)`. |

### 5.4 `pipeline_runs`
**Plain English:** One row per pipeline execution. A project has at least one PRD run and, if the user requests add-ons, one add-on run (and more if they regenerate). This is the object Inngest keys its work off, and its `pipeline_steps` power the live status UI.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | uuid (FK → projects.id) | Indexed. |
| `kind` | enum (`prd`, `addons`) | Which pipeline. |
| `requested_docs` | jsonb | For `addons` runs: the selected subset, e.g. `["technical","tickets"]`. |
| `notes` | text (nullable) | Optional user regeneration notes ("focus on monetization"). |
| `status` | enum | `queued`, `running`, `complete`, `failed`. |
| `inngest_run_id` | text (nullable) | For correlating with Inngest traces/logs. |
| `started_at` / `completed_at` | timestamptz | Used for the "time to PRD" success metric. |

### 5.5 `pipeline_steps`
**Plain English:** One row per agent step inside a run — the granular status board the frontend reads to show "Researching… / Drafting… / Refining…". Seeded as `pending` when the run is created; Inngest flips each to `running` then `complete`/`failed`. Also where you record per-step cost/latency for unit-economics analysis (PRD §11).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `run_id` | uuid (FK → pipeline_runs.id) | Indexed. |
| `agent` | enum | `research`, `draft`, `refine`, `technical`, `security`, `ui_ux`, `tickets`. |
| `order_index` | int | Fixed execution order (0..n) for rendering the stepper. |
| `status` | enum | `pending`, `running`, `complete`, `failed`, `skipped`. |
| `model` | text | Which model ran this step (audit + cost). |
| `input_tokens` / `output_tokens` | int (nullable) | For cost tracking. |
| `latency_ms` | int (nullable) | For the latency metric. |
| `error` | text (nullable) | Last error if failed. |
| `started_at` / `completed_at` | timestamptz | |

### 5.6 `references`
**Plain English:** Uploaded inspiration for the UI/UX agent only (PRD §5.1) — links and/or images. Files themselves live in R2; this table holds the pointer and metadata. Read by the UI/UX step.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | uuid (FK → projects.id) | Indexed. |
| `kind` | enum (`link`, `image`) | |
| `url` | text | External link, or the R2 object URL for an uploaded image. |
| `storage_key` | text (nullable) | R2 object key (images only). |
| `note` | text (nullable) | Optional user caption ("our brand blue"). |
| `created_at` | timestamptz | |

### 5.7 `payments`
**Plain English:** One row per one-time Stripe charge for an extra project beyond the free monthly one (PRD §10). Written by the Stripe webhook, linked to the project it unlocked. Not a subscription table — deliberately minimal, extensible later.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users.id) | Indexed. |
| `project_id` | uuid (FK → projects.id, nullable) | The project this payment unlocked. |
| `stripe_checkout_session_id` | text (unique) | Idempotency key — dedupes webhook retries. |
| `stripe_payment_intent_id` | text (nullable) | For refunds/reconciliation. |
| `amount_cents` | int | What they paid (price is a launch open question, PRD §10). |
| `currency` | text | e.g. `usd`. |
| `status` | enum (`pending`, `succeeded`, `failed`, `refunded`) | |
| `created_at` | timestamptz | |

### 5.8 `monthly_usage`
**Plain English:** A small counter table making quota checks O(1) and race-safe instead of counting `projects` rows on every "New Project" click. One row per user per calendar month. Optional but recommended once you have any traffic; also the natural place to add basic abuse signals (PRD §11).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users.id) | |
| `period` | text | Calendar month key, e.g. `2026-07`. |
| `projects_created` | int | Incremented atomically on project creation. |
| | | **Unique constraint:** `(user_id, period)`. |

### 5.9 Relationships at a glance

```
users (1) ───< projects (N)
users (1) ───< payments (N)
users (1) ───< monthly_usage (N, one per month)

projects (1) ───< documents (N, unique per type)
projects (1) ───< pipeline_runs (N)
projects (1) ───< references (N)
projects (1) ───< payments (0..1)

pipeline_runs (1) ───< pipeline_steps (N)
```

### 5.10 Schema notes & decisions

- **No `document_versions` table.** PRD §9 explicitly defers version history; regenerate overwrites. If you want internal safety without exposing history to users, add an append-only `document_revisions` table later — but it's not v1.
- **Research brief is a `document` with `is_user_facing = false`**, not a special table. Keeps the "each agent reads everything before it" contract uniform: every artifact is a document, the pipeline just filters which ones export.
- **Status lives in `pipeline_steps`, not `projects`.** `projects.status` is a coarse rollup; the fine-grained live indicator reads `pipeline_steps`. Don't duplicate the truth.
- **Quota counts `projects.created_at` by calendar month** (or the `monthly_usage` counter). A project in `payment_pending` that never gets paid should either be excluded from the count or garbage-collected on a schedule so abandoned checkouts don't consume the free slot.
- **Access control is enforced in the server layer**: every query filters by the authenticated `user_id`. If you move to Supabase, add Row-Level Security policies as defense-in-depth.

---

## 6. Environment Variables & Configuration

Create `.env.local` (git-ignored) and commit a `.env.example` with these keys and dummy values so anyone (or any AI tool) building the app knows what's needed.

```bash
# ─── App ───────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000     # base URL for OAuth/Stripe redirects & webhooks
NODE_ENV=development

# ─── Auth (Clerk) ──────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...                # verifies the user.created webhook
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ─── Database (Neon Postgres) ──────────────────────────
DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/spec0?sslmode=require
# Use the POOLED connection string for the app (serverless), and the
# DIRECT/unpooled string for Drizzle migrations:
DIRECT_DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/spec0?sslmode=require

# ─── LLM gateway (Mesh API) ────────────────────────────
MESH_API_KEY=rsk_...                           # Router Service Key; used as the Bearer token
MESH_BASE_URL=https://api.meshapi.ai/v1        # OpenAI-compatible base URL
# Model config lives in agents/config.ts; keep overridable, provider-prefixed defaults here.
# VERIFY exact IDs against the Mesh "Models" page before relying on them:
MODEL_RESEARCH=anthropic/claude-sonnet-5       # research + web search
MODEL_DRAFTING=anthropic/claude-sonnet-5
MODEL_REFINE=anthropic/claude-opus-4-8         # quality gate → strongest model
MODEL_ADDONS=anthropic/claude-sonnet-5
MODEL_LIGHT=google/gemini-flash                # cheap/fast steps, or use Mesh auto-routing
MESH_ENABLE_WEB_SEARCH=true                    # toggle web search on the research call
# Web search and RAG are Mesh features — no separate search-provider key needed.

# ─── Background orchestration (Inngest) ────────────────
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=signkey-...

# ─── Object storage (Cloudflare R2) ────────────────────
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=spec0-artifacts
R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev      # or your custom domain

# ─── Payments (Stripe) ─────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_PER_PROJECT=price_...             # the one-time price object

# ─── Observability ─────────────────────────────────────
# Cost/latency/token tracking is handled by Mesh audit logs + per-key spend caps (no env needed).
# Langfuse is OPTIONAL — add only if you want prompt-quality eval traces:
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=https://cloud.langfuse.com
SENTRY_DSN=https://...@sentry.io/...

# ─── Email (Resend) ────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM="Spec0 <noreply@yourdomain.com>"

# ─── App config / limits ───────────────────────────────
FREE_PROJECTS_PER_MONTH=1
MAX_REFERENCE_UPLOADS=5
MAX_UPLOAD_MB=10
```

### 6.1 Configuration notes to know *before* you start

1. **Neon has two connection strings.** Use the **pooled** URL for the running app (serverless functions open many short connections) and the **direct/unpooled** URL for Drizzle migrations. Mixing them up causes intermittent "too many connections" errors that are painful to debug.
2. **Every webhook needs its signing secret verified.** Stripe and Clerk both send webhooks; verify the signature (`STRIPE_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET`) on every request or you have an open write endpoint. For local dev, use the Stripe CLI (`stripe listen`) and Clerk's tunnel.
3. **Inngest needs a public URL in production** (the `/api/inngest` route). Locally, run the Inngest Dev Server (`npx inngest-cli dev`) which auto-discovers your functions — no keys needed in dev. `INNGEST_SIGNING_KEY`/`EVENT_KEY` are production-only.
4. **Model IDs are config, not hardcoded — and Mesh-prefixed.** Mesh uses `provider/model` IDs (e.g. `anthropic/claude-opus-4-8`, `openai/gpt-4o`, `google/gemini-flash`). Keep the per-agent mapping in `agents/config.ts` with env overrides. Refine (the quality gate) gets the strongest model; light steps get a cheap/fast one or Mesh **auto-routing**. **Confirm exact IDs on the Mesh "Models" page — my defaults are plausible, not verified.**
5. **Set your budget guardrail in Mesh, not just in code.** Configure a **spend cap** (and RPM/RPD/TPM) on the API key from the Mesh dashboard so a runaway pipeline can't blow past budget regardless of app bugs. Also cap max output tokens per agent and set Inngest step timeouts so a stuck step fails fast. Mesh's <100ms failover covers provider outages within a call.
6. **R2 uploads use presigned URLs.** The browser uploads reference images straight to R2 via a short-lived presigned PUT URL from `/api/uploads/presign` — never proxy file bytes through your serverless function. Validate content-type and size server-side before issuing the URL.
7. **`NEXT_PUBLIC_*` vars are exposed to the browser.** Only publishable keys and the app URL belong there. Never prefix a secret with `NEXT_PUBLIC_`.
8. **Idempotency on payments.** Stripe retries webhooks; the unique `stripe_checkout_session_id` on `payments` is your dedupe key. Handle the same event arriving twice as a no-op.

---

## 7. The PRD's Open Risks, Answered by This Architecture

The PRD (§11) names six risks. Here's how the architecture addresses each so you can build with them in mind:

| PRD risk | How this architecture handles it |
|---|---|
| **Output quality consistency** | Prompts are versioned code in `agents/prompts/`; optional Langfuse traces every step; `agents/` runs standalone so you can execute your "test-idea suite" against it in CI and score outputs before shipping a prompt change. Mesh's model catalog lets you A/B a stronger model on a weak step without a code rewrite. |
| **Cost per generation** | **Mesh audit logs capture per-call tokens/latency/dollars automatically**, and a **per-key spend cap** is a hard budget ceiling. Mirror per-step tokens into `pipeline_steps` too; use a cheap model for light agents and the strong one only for Refine. Read real cost-per-project from Mesh before setting the paid price. |
| **Latency (7 sequential calls)** | Inngest runs it durably off the request path; the DB-backed status board drives the live "Researching…/Drafting…" UI (PRD §5.1) so users never see a blank spinner. Mesh's <100ms failover keeps a single step from stalling on a provider outage. The "review at the end" toggle is free because progress persists. |
| **Research quality** | Research is an isolated agent using **Mesh's built-in web search** (RAG files available for grounding uploaded references); you can add source-quality guardrails in one file, or swap the research model via config, without touching the pipeline. |
| **Security doc is generic in v1** | This is a product/copy concern, not architecture — set expectations in the UI on the add-on selection screen. The architecture just treats it as another document type. |
| **Free-tier abuse** | Server-side quota via `monthly_usage`; Clerk provides email verification + bot signals; add IP/device rate-limiting at the Server Action later. A **Mesh per-key spend cap** is a final backstop that limits total damage even if quota logic is bypassed. Never trust client-side quota state. |

---

## 8. Suggested Build Order

1. **Foundation** — Next.js + Tailwind + shadcn, Clerk auth, Neon + Drizzle schema & first migration, Clerk→`users` webhook. *(You can log in and see an empty dashboard.)*
2. **The pipeline spine** — Mesh client in `lib/mesh.ts` (AI SDK, `baseURL` → Mesh, `rsk_` key) with a spend cap set on the key; Inngest wired up; `agents/` module with the 3 PRD prompts; `runPrdPipeline` writing documents + step status. Test end-to-end from a script before touching UI.
3. **Core UX** — intake form → live status component (polling `/status`) → PRD viewer/editor. This is the MVP's demoable heart.
4. **Add-ons** — add-on selector, R2 presigned uploads + `references`, `runAddonPipeline` (4 docs, fixed order), per-doc view/edit, zip export.
5. **Money & metering** — `monthly_usage` quota check, Stripe Checkout + webhook, `payments`, paywall on 2nd project.
6. **Hardening** — Sentry, the test-idea eval suite (optionally Langfuse traces), rate limits, abandoned-`payment_pending` cleanup job (an Inngest cron). Cost tracking is already live in the Mesh dashboard.

Ship 1–4 as the internal alpha, add 5–6 before public launch.

---

*This document is derived from PRD.md and should be revised alongside it. The one architectural decision worth defending hardest is §1 (durable orchestration): if you take away nothing else, don't run the agent pipeline inside a single HTTP request.*
