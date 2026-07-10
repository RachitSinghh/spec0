# Spec0 — Feature Ticket List

| Field | Detail |
|---|---|
| Document Owner | Engineering Lead |
| Status | Draft v1.0 |
| Last Updated | July 10, 2026 |
| Source | Derived from `PRD.md`, `FRONTEND-SPEC.md`, `TECHNICAL-ARCHITECTURE.md` |
| Scope | v1 (MVP) launch backlog |

---

## How to Use This Document

Each ticket is written so it can be pasted **directly into an AI coding tool** (Claude Code, Cursor, etc.) as a build prompt. Every ticket contains:

- **Description** — what to build, with concrete file paths and library choices from the architecture.
- **Acceptance criteria** — the checklist that defines "done."
- **Dependencies** — tickets that must be complete first.
- **Priority** — `MUST-HAVE` (launch blocker), `SHOULD-HAVE` (launch-adjacent, can slip), `NICE-TO-HAVE` (post-MVP, listed for continuity).

Tickets are grouped into epics that follow the suggested build order in `TECHNICAL-ARCHITECTURE.md §8`. Ship **E0–E4** as the internal alpha; add **E5–E6** before public launch.

**Two hard design rules apply to every UI ticket** (from `FRONTEND-SPEC.md`): `0px border radius everywhere` (only exception: the radio inner circle) and `no shadows, ever` — hierarchy comes from border weight (1px/3px/5px) and scale only.

---

## Epic Index

| Epic | Theme | Tickets | Alpha? |
|---|---|---|---|
| **E0** | Foundation & Config | T-001 … T-005 | ✅ |
| **E1** | Auth & App Shell | T-010 … T-013 | ✅ |
| **E2** | Pipeline Spine (backend) | T-020 … T-024 | ✅ |
| **E3** | Core PRD UX | T-030 … T-035 | ✅ |
| **E4** | Add-on Docs & Export | T-040 … T-045 | ✅ |
| **E5** | Money & Metering | T-050 … T-053 | Pre-launch |
| **E6** | Hardening & Ops | T-060 … T-065 | Pre-launch |
| **E7** | Post-MVP (deferred) | T-070 … T-078 | ❌ |

---

# EPIC E0 — Foundation & Config

## T-001 — Project scaffold (Next.js 15 + Tailwind + shadcn/ui)

**Priority:** MUST-HAVE
**Dependencies:** none

**Description:**
Initialize the `spec0` Next.js 15 App Router project in TypeScript. Set up Tailwind CSS and shadcn/ui. Create the folder structure exactly as specified in `TECHNICAL-ARCHITECTURE.md §4`: route groups `(marketing)`, `(auth)`, `(app)`; and the `src/actions`, `src/inngest`, `src/agents`, `src/db`, `src/lib`, `src/components`, `src/types` directories with placeholder index files. Configure `tsconfig.json` path aliases (`@/*` → `src/*`). Add `drizzle.config.ts` and `tailwind.config.ts` stubs.

```
Build the initial Next.js 15 (App Router, TypeScript, strict mode) project scaffold for
"spec0". Use Tailwind CSS and initialize shadcn/ui. Create the exact folder tree from the
technical architecture: src/app with route groups (marketing)/(auth)/(app), src/actions,
src/inngest/functions, src/agents/prompts, src/db/queries, src/lib, src/components/ui,
src/types. Add path alias @/* -> src/*. Do not add business logic yet — scaffold only.
```

**Acceptance criteria:**
- [ ] `npm run dev` boots a blank app on `localhost:3000` with no errors.
- [ ] Folder structure matches `TECHNICAL-ARCHITECTURE.md §4` exactly.
- [ ] Tailwind and shadcn/ui are installed and a sample shadcn component renders.
- [ ] `tsc --noEmit` passes; `@/*` alias resolves.

---

## T-002 — RawBlock design system (tokens, typography, core components)

**Priority:** MUST-HAVE
**Dependencies:** T-001

**Description:**
Implement the RawBlock brutalist design system from `FRONTEND-SPEC.md` Part A as reusable tokens + components. Define color tokens (A2), typography scale (A3, self-hosted Archivo Black / Work Sans / Space Mono — **no external CDN**), spacing scale (A4), and border-weight utilities (`border-thin` 1px, `border-thick` 3px, `border-heavy` 5px). Build/restyle the core components: Button (4 variants × 3 sizes, A5.1), Input/Textarea (A5.2), Card (default + elevated, A5.3), Chips (filter + status, A5.6), List (A5.7), Checkbox & Radio (A5.8), Tooltip (A5.9). Enforce the two hard rules: `border-radius: 0` everywhere (except radio inner circle), no `box-shadow` anywhere. Disabled states use `#CCCCCC` borders + grey fill, never opacity.

```
Implement the RawBlock design system as Tailwind config tokens + a component library in
src/components/ui. Colors, type (Archivo Black / Work Sans / Space Mono self-hosted),
spacing, and border weights per the frontend spec Part A2–A4. Build Button (Primary/
Secondary/Ghost/Destructive × Small/Medium/Large with full color-inversion hover),
Input, Textarea, Card (default + 5px elevated), filter+status Chips, List, Checkbox,
Radio (circle is the ONLY 0px-radius exception), Tooltip. HARD RULES: border-radius 0
everywhere, never box-shadow, disabled = grey borders/fill not opacity. Add a /styleguide
page rendering every component + state for visual QA.
```

**Acceptance criteria:**
- [ ] All tokens available as Tailwind classes and CSS variables.
- [ ] Fonts are self-hosted (no external font CDN request in network tab).
- [ ] No element in the library has non-zero border-radius (except radio inner dot) or any box-shadow.
- [ ] Button hover produces full black↔white inversion; active state uses 5px border.
- [ ] Ghost button hover is the only control where blue (`#0000FF`) appears.
- [ ] A `/styleguide` route renders every component and every documented state.

---

## T-003 — Environment config + typed validation

**Priority:** MUST-HAVE
**Dependencies:** T-001

**Description:**
Create `.env.example` with every key from `TECHNICAL-ARCHITECTURE.md §6` (Clerk, Neon `DATABASE_URL` + `DIRECT_DATABASE_URL`, Mesh, Inngest, R2, Stripe, Sentry, Resend, Langfuse, and app-limit vars `FREE_PROJECTS_PER_MONTH`/`MAX_REFERENCE_UPLOADS`/`MAX_UPLOAD_MB`). Add a typed env loader (e.g. `@t3-oss/env-nextjs` or a hand-rolled Zod schema) in `src/lib/env.ts` that validates presence at boot and distinguishes `NEXT_PUBLIC_*` (browser-safe) from server secrets. App limits are read from env, never hardcoded.

```
Create .env.example documenting every environment variable from the technical architecture
§6 with dummy values and section comments. Add src/lib/env.ts using Zod to validate and
type all env vars at startup, splitting client (NEXT_PUBLIC_*) from server-only secrets so
a secret can never leak to the browser. Expose FREE_PROJECTS_PER_MONTH, MAX_REFERENCE_
UPLOADS, MAX_UPLOAD_MB as typed config. Fail fast with a clear error if a required var is
missing.
```

**Acceptance criteria:**
- [ ] `.env.example` lists all variables from §6 with comments, committed to git.
- [ ] Boot fails with a readable error naming any missing required var.
- [ ] Importing a server-only secret into a client component is a type/lint error.
- [ ] App limits (free quota, upload caps) resolve from env.

---

## T-004 — Database schema + first migration (Drizzle + Neon)

**Priority:** MUST-HAVE
**Dependencies:** T-001, T-003

**Description:**
Define all 8 tables from `TECHNICAL-ARCHITECTURE.md §5` in `src/db/schema.ts` as the single source of truth: `users`, `projects`, `documents`, `pipeline_runs`, `pipeline_steps`, `references`, `payments`, `monthly_usage`. Match every field, enum, nullability, FK, and index. Enforce the key constraints: `documents` UNIQUE `(project_id, type)`; `payments.stripe_checkout_session_id` UNIQUE; `monthly_usage` UNIQUE `(user_id, period)`. Configure `drizzle.config.ts` to use `DIRECT_DATABASE_URL` for migrations. Generate and commit `drizzle/0000_init.sql`.

```
In src/db/schema.ts define all tables from the technical architecture §5 using Drizzle ORM
for Postgres: users, projects, documents, pipeline_runs, pipeline_steps, references,
payments, monthly_usage. Reproduce every field/type/enum/nullability/FK/index exactly.
Enforce UNIQUE(project_id,type) on documents, UNIQUE on payments.stripe_checkout_session_id,
UNIQUE(user_id,period) on monthly_usage. Add created_at/updated_at to all tables. Configure
drizzle.config.ts to run migrations over DIRECT_DATABASE_URL. Generate migration
drizzle/0000_init.sql and commit it.
```

**Acceptance criteria:**
- [ ] All 8 tables + enums exist in `schema.ts` matching §5 field-for-field.
- [ ] The three unique constraints are enforced at the DB level.
- [ ] `drizzle-kit generate` produces `0000_init.sql`; migration applies cleanly to a fresh Neon DB.
- [ ] Migrations use the direct (unpooled) connection string.

---

## T-005 — Drizzle client + typed query helpers

**Priority:** MUST-HAVE
**Dependencies:** T-004

**Description:**
Create the Drizzle client in `src/db/index.ts` using the **pooled** `DATABASE_URL` (Neon serverless driver). Add typed query modules under `src/db/queries/`: `projects.ts` (get by id scoped to user, list by user, create, update status/title), `documents.ts` (upsert by `(project_id, type)`, get by project, list user-facing), `usage.ts` (read/increment `monthly_usage` for a period). Every read/write filters by `user_id` — this is the app's primary access-control layer.

```
Create src/db/index.ts: a Drizzle client using the pooled DATABASE_URL and Neon serverless
driver. Add typed query helpers in src/db/queries/{projects,documents,usage}.ts. projects:
getProjectForUser(id,userId), listProjectsForUser(userId), createProject, updateProject.
documents: upsertDocument (respect UNIQUE(project_id,type)), getDocumentsForProject,
listUserFacingDocuments. usage: getMonthlyUsage(userId,period), incrementMonthlyUsage
(atomic upsert). EVERY query must take and filter by userId — never return another user's row.
```

**Acceptance criteria:**
- [ ] App uses the pooled connection string (migrations still use direct).
- [ ] `document` upsert respects the `(project_id, type)` unique constraint (overwrite, not duplicate).
- [ ] `incrementMonthlyUsage` is atomic (single upsert, race-safe).
- [ ] No query returns a row for a `user_id` other than the caller's.

---

# EPIC E1 — Auth & App Shell

## T-010 — Clerk authentication integration

**Priority:** MUST-HAVE
**Dependencies:** T-001, T-003

**Description:**
Integrate Clerk (`@clerk/nextjs`). Wrap the root layout in `<ClerkProvider>`. Add middleware protecting the `(app)` route group and leaving `(marketing)` + `(auth)` public. Add `src/lib/auth.ts` with `getCurrentUser()` helpers wrapping `auth()`/`currentUser()` for use in Server Actions and Route Handlers. Redirect unauthenticated access to protected routes to `/sign-in`.

```
Integrate Clerk auth into the Next.js app. Wrap root layout in ClerkProvider. Add
middleware.ts protecting the (app) route group; keep (marketing) and (auth) public. Create
src/lib/auth.ts exporting getCurrentUser() and requireUser() using @clerk/nextjs/server.
Unauthenticated hits on protected routes redirect to /sign-in. Wire NEXT_PUBLIC_CLERK_*
and CLERK_SECRET_KEY from env.
```

**Acceptance criteria:**
- [ ] Visiting `/dashboard` while logged out redirects to `/sign-in`.
- [ ] `getCurrentUser()` returns the authenticated user in server contexts.
- [ ] Marketing and auth routes are reachable while logged out.

---

## T-011 — Auth routes restyled to RawBlock

**Priority:** MUST-HAVE
**Dependencies:** T-010, T-002

**Description:**
Add `(auth)/sign-in/[[...rest]]/page.tsx` and `(auth)/sign-up/[[...rest]]/page.tsx` using Clerk's `<SignIn/>` / `<SignUp/>` prebuilt components, restyled via Clerk's `appearance` API to RawBlock (`FRONTEND-SPEC.md A6.2`): square inputs, 3px black borders, black Primary button, Archivo Black headings, no shadows. Error states render as RawBlock error inputs (3px red border).

```
Create the (auth) sign-in and sign-up routes using Clerk's <SignIn/> and <SignUp/>
components. Apply the appearance prop so they match RawBlock: 0px radius, 3px black borders
on inputs, black primary button with uppercase tracking, Archivo Black headings, no shadows.
Error state = 3px red (#FF0000) border. No layout shift vs the rest of the app shell.
```

**Acceptance criteria:**
- [ ] Sign-in/up pages render Clerk components visually consistent with RawBlock.
- [ ] No rounded corners or shadows on any auth control.
- [ ] Validation errors show the RawBlock red-border treatment.
- [ ] A full signup → logged-in → dashboard flow works.

---

## T-012 — Clerk → `users` mirror webhook

**Priority:** MUST-HAVE
**Dependencies:** T-005, T-010

**Description:**
Implement `POST /api/webhooks/clerk` (`FRONTEND-SPEC.md B2`). Verify the Svix signature using `CLERK_WEBHOOK_SECRET`. On `user.created` / `user.updated`, upsert a `users` row (`clerk_id`, `email`). Return `200`. Reject unsigned/invalid requests with `401`.

```
Create the Route Handler POST /api/webhooks/clerk. Verify the Svix signature with
CLERK_WEBHOOK_SECRET; reject invalid signatures with 401. On user.created/user.updated,
upsert a users row keyed on clerk_id (store clerk_id + email). Return 200. This is an open
write endpoint if unsigned — signature verification is mandatory.
```

**Acceptance criteria:**
- [ ] A new Clerk signup creates exactly one matching `users` row.
- [ ] Repeat/`user.updated` events upsert (no duplicates).
- [ ] Requests with a missing/invalid Svix signature return `401` and write nothing.
- [ ] Returns `200` on success.

---

## T-013 — Authenticated app shell (top nav + quota counter)

**Priority:** MUST-HAVE
**Dependencies:** T-010, T-002

**Description:**
Build `(app)/layout.tsx`: a persistent top nav with a 3px black bottom border, left-flush "SPEC0" wordmark in Archivo Black, and right-flush Clerk `<UserButton/>` + a quota counter status chip (`PROJECTS THIS MONTH: 0/1 FREE`, `FRONTEND-SPEC.md A4/A6.3`). No sidebar in v1. Responsive: single-column stack below 768px. The quota chip flips to the Warning variant at the limit (real data wired in T-050).

```
Build the authenticated app shell at (app)/layout.tsx. Top nav: 3px black bottom border,
left "SPEC0" wordmark in Archivo Black, right-flush Clerk <UserButton/> and a quota status
chip reading "PROJECTS THIS MONTH: X/1 FREE" (Default chip; Warning variant at limit). No
sidebar. Below 768px, stack to single column. Stub the quota numbers for now (wired to real
usage later).
```

**Acceptance criteria:**
- [ ] Nav persists across all `(app)` routes with a 3px black bottom border.
- [ ] `<UserButton/>` and quota chip are right-flush; wordmark left-flush.
- [ ] Quota chip switches to Warning styling when at/over limit.
- [ ] Layout collapses cleanly below 768px.

---

# EPIC E2 — Pipeline Spine (Backend)

## T-020 — Mesh LLM client (`lib/mesh.ts`)

**Priority:** MUST-HAVE
**Dependencies:** T-003

**Description:**
Create `src/lib/mesh.ts`: the Vercel AI SDK's OpenAI-compatible provider with `baseURL` pointed at `MESH_BASE_URL` and `MESH_API_KEY` as the bearer (`TECHNICAL-ARCHITECTURE.md §2.2`, `FRONTEND-SPEC.md B3`). Expose helpers for: a plain chat/generate call, a structured-output call (JSON schema via `response_format`), a web-search-enabled call (for the Research agent), and RAG file upload/vector-search helpers (Init Upload → Trigger Embedding → Vector Search). Return normalized `{ content, usage: { input_tokens, output_tokens }, model, latency_ms }`. **Backend-only** — never importable by client components.

```
Create src/lib/mesh.ts wrapping the Vercel AI SDK's OpenAI-compatible provider with baseURL
= MESH_BASE_URL and Bearer MESH_API_KEY. Export: generate(opts) for text, generateStructured
(opts, zodSchema) using JSON-schema response_format with retry-on-mismatch, generateWithSearch
(opts) enabling Mesh web search, and RAG helpers uploadReference()/vectorSearch(). Every call
returns { content, usage:{input_tokens,output_tokens}, model, latency_ms }. Mark the module
server-only so it can never be bundled into the browser.
```

**Acceptance criteria:**
- [ ] A test script calls Mesh and gets back normalized content + token usage + latency.
- [ ] Structured-output helper validates against a Zod schema and retries on mismatch.
- [ ] Web-search helper returns results grounded in fresh web content.
- [ ] Importing `lib/mesh.ts` in a client component throws a build error (`server-only`).

---

## T-021 — Agents module (prompts, config, shared runner)

**Priority:** MUST-HAVE
**Dependencies:** T-020

**Description:**
Build the self-contained `src/agents/` module with **no Next.js imports** (`TECHNICAL-ARCHITECTURE.md §4`). Add `types.ts` (`AgentContext`, `AgentResult` contracts), `config.ts` (per-agent model mapping from env: Research/Draft/Add-ons → `MODEL_DRAFTING`, Refine → `MODEL_REFINE`, light → `MODEL_LIGHT`), `run-agent.ts` (shared runner: builds messages, calls Mesh with the right model/search/RAG settings, optional Langfuse trace, returns `AgentResult`), and versioned prompt files in `prompts/`: `research.ts`, `draft.ts`, `refine.ts`, `technical.ts`, `security.ts`, `ui-ux.ts`, `tickets.ts`. Each prompt encodes the agent's distinct role and handoff contract from `PRD.md §7`. Research returns a structured brief (JSON schema); Draft/Refine/add-ons return Markdown; Tickets can use structured output.

```
Create the src/agents/ module with ZERO Next.js imports so it's unit-testable standalone.
Files: types.ts (AgentContext { idea, priorDocs, references?, notes? }, AgentResult
{ content, usage, model }), config.ts (per-agent model from env), run-agent.ts (shared
runner: assemble messages from AgentContext, call the right lib/mesh helper — web search for
research, RAG for ui-ux, structured output for research brief + tickets — return AgentResult),
and prompts/{research,draft,refine,technical,security,ui-ux,tickets}.ts as versioned system-
prompt constants. Encode each agent's distinct job + handoff contract from PRD §7: Research
outputs a structured brief; Draft writes a full PRD from idea+brief; Refine critiques and
tightens; add-on agents each read PRD + all prior docs. Prompts live as code files (git-
versioned), not Mesh templates.
```

**Acceptance criteria:**
- [ ] `agents/` imports nothing from `next` — a standalone Node script can run any agent.
- [ ] Each of the 7 agents has a distinct prompt file reflecting its `PRD.md §7` role.
- [ ] Model selection per agent reads from env config (Refine gets the strongest model).
- [ ] Research agent returns a schema-validated brief; Tickets returns structured/validated output.
- [ ] `run-agent.ts` returns token usage + model for cost tracking downstream.

---

## T-022 — Inngest client + event contracts

**Priority:** MUST-HAVE
**Dependencies:** T-001, T-003

**Description:**
Set up Inngest (`src/inngest/client.ts`) with typed events: `project/prd.requested` (`{ projectId, userId, notes? }`) and `project/addons.requested` (`{ projectId, userId, requestedDocs, references? }`) per `FRONTEND-SPEC.md B4`. Create the serve Route Handler `POST /api/inngest`. Document local dev via `npx inngest-cli dev` (no keys needed locally; `INNGEST_SIGNING_KEY`/`EVENT_KEY` are production-only).

```
Set up Inngest. src/inngest/client.ts: create the client with a typed event schema for
"project/prd.requested" ({projectId,userId,notes?}) and "project/addons.requested"
({projectId,userId,requestedDocs:string[],references?}). Create the serve endpoint at
POST /api/inngest registering the functions directory. Add a README note: run `npx
inngest-cli dev` locally (auto-discovers functions, no keys); signing/event keys are prod-only.
```

**Acceptance criteria:**
- [ ] Inngest Dev Server discovers the app's functions at `/api/inngest`.
- [ ] Events are typed; emitting with a wrong payload is a TS error.
- [ ] Serve endpoint verifies the signing key in production.

---

## T-023 — `runPrdPipeline` durable function (Research → Draft → Refine)

**Priority:** MUST-HAVE
**Dependencies:** T-005, T-021, T-022

**Description:**
Implement `src/inngest/functions/run-prd-pipeline.ts` triggered by `project/prd.requested` (`TECHNICAL-ARCHITECTURE.md §3.2`). Three memoized `step.run` calls: `research` (web search → write `documents` row `type=research_brief`, `is_user_facing=false`), `draft` (reads brief → write `type=prd`), `refine` (reads draft → overwrite `prd` with final). Each step boundary: set the matching `pipeline_step` `running` → `complete`/`failed`, record `model`/`input_tokens`/`output_tokens`/`latency_ms`, and set timestamps. On any step failure, mark that step `failed` and roll the `pipeline_run` + `project.status` to `failed`. Regeneration re-emits the same event and overwrites in place (no version history, `PRD.md §9`).

```
Implement src/inngest/functions/run-prd-pipeline.ts on event project/prd.requested. Three
memoized step.run() steps: "research" (agents research agent w/ web search -> upsert
documents research_brief, is_user_facing=false), "draft" (-> documents prd), "refine"
(reads draft -> overwrite prd with final). Before/after each step, update the matching
pipeline_steps row: pending->running->complete/failed, and record model, input_tokens,
output_tokens, latency_ms, started_at, completed_at. On failure mark step failed + run failed
+ project.status failed. Steps MUST be memoized so a retry never re-runs (or re-pays for) a
completed step. Regenerate = same event, overwrite documents in place.
```

**Acceptance criteria:**
- [ ] End-to-end run produces `research_brief` (internal) + final `prd` documents.
- [ ] Each step writes `running` then `complete` to `pipeline_steps` with token/latency data.
- [ ] Forcing a step-3 failure does **not** re-execute steps 1–2 on retry (memoization verified).
- [ ] A failed step sets the step, run, and project statuses to `failed` with the error recorded.
- [ ] Re-emitting the event overwrites the existing `prd` document (no second row).

---

## T-024 — Pipeline status endpoint (DB-as-status-board)

**Priority:** MUST-HAVE
**Dependencies:** T-005, T-023

**Description:**
Implement `GET /api/projects/[projectId]/status` (`FRONTEND-SPEC.md B7`). Auth via Clerk session; scope to the owner. Read `pipeline_steps` (+ latest `pipeline_run`) from Postgres and return `{ run: { kind, status }, steps: [{ agent, order_index, status, model?, tokens?, latency_ms? }] }`. The browser observes progress **only** through this endpoint — never by calling Inngest or Mesh directly (`FRONTEND-SPEC.md` closing note). Optional SSE variant.

```
Create GET /api/projects/[projectId]/status. Resolve the Clerk session server-side and 404
if the project isn't the caller's. Read the latest pipeline_run and its pipeline_steps from
Postgres and return { run:{kind,status}, steps:[{agent,order_index,status,model?,tokens?,
latency_ms?}] } ordered by order_index. This is the ONLY way the frontend learns pipeline
progress — it reads the DB, never Inngest/Mesh. Keep it cheap (single indexed query); it's
polled every ~2s.
```

**Acceptance criteria:**
- [ ] Returns ordered step statuses reflecting live pipeline progress.
- [ ] Requesting another user's project returns 404/403, not their data.
- [ ] Response shape matches the `FRONTEND-SPEC.md B7` contract.
- [ ] Endpoint is a single indexed query, safe to poll every 2s.

---

# EPIC E3 — Core PRD UX

## T-030 — Dashboard + project list

**Priority:** MUST-HAVE
**Dependencies:** T-013, T-005

**Description:**
Build `(app)/dashboard/page.tsx` (`FRONTEND-SPEC.md A6.3`). `h2` "YOUR PROJECTS"; quota counter chip; Large Primary "NEW PROJECT" button (routes to `/projects/new`, or opens paywall modal when over quota — paywall wired in T-053). Project List (RawBlock List component): each row shows title, a status chip (`PRD ONLY` / `FULL PACKAGE` / `FAILED` / `PAYMENT PENDING`), and a Ghost "download" link; hover underlines, active row inverts. Empty state: mono line `> no projects yet. describe an idea to begin.` Data via Server Component + `db/queries/projects.ts`.

```
Build (app)/dashboard/page.tsx as a Server Component reading listProjectsForUser. h2 "YOUR
PROJECTS". Show the quota chip and a Large Primary "NEW PROJECT" button linking to
/projects/new. Render projects with the RawBlock List: each row = title + status chip
(PRD ONLY / FULL PACKAGE / FAILED / PAYMENT PENDING) + Ghost "download" link; hover underline,
active row inverts to black/white. Empty state renders the mono line "> no projects yet.
describe an idea to begin." No shadows, 0px radius.
```

**Acceptance criteria:**
- [ ] Logged-in user sees only their own projects, newest first.
- [ ] Each row shows correct status chip and a working download link (when applicable).
- [ ] Empty state shows the exact mono placeholder line.
- [ ] "NEW PROJECT" routes to intake (paywall hook present for T-053).

---

## T-031 — Idea intake form + `createProject` action

**Priority:** MUST-HAVE
**Dependencies:** T-030, T-023, T-005

**Description:**
Build `(app)/projects/new/page.tsx` (`FRONTEND-SPEC.md A6.4`): `h2` "DESCRIBE YOUR IDEA"; a mono Textarea (min 8 rows) plus three optional structured Inputs (PROBLEM / AUDIENCE / ROUGH SCOPE) with Archivo Black uppercase labels; Large Primary "GENERATE PRD". Implement Server Action `createProject({ ideaText, ideaMeta? })` in `src/actions/projects.ts` (`FRONTEND-SPEC.md B7`): resolve user, **server-side quota check** (returns `{ paymentRequired: true }` if over — enforced in T-050), else create `project` (`status=draft`) + `pipeline_run(kind='prd')` + seed `pipeline_steps` (research/draft/refine `pending`), emit `project/prd.requested`, return `{ projectId }`. On submit, route to `/projects/[projectId]`.

```
Build (app)/projects/new/page.tsx: h2 "DESCRIBE YOUR IDEA", a mono textarea (min 8 rows,
required) + three optional inputs PROBLEM/AUDIENCE/ROUGH SCOPE with Archivo Black uppercase
labels, Large Primary "GENERATE PRD". Implement Server Action createProject({ideaText,
ideaMeta?}) in src/actions/projects.ts: resolve Clerk user; run the server-side quota check
(stub returning allowed for now, real check in the metering epic — return {paymentRequired:
true} when over); on allow, create project(status=draft) + pipeline_run(kind=prd) + seed
three pending pipeline_steps, then inngest.send("project/prd.requested",{projectId,userId}),
return {projectId}. Client routes to /projects/[projectId] on success; show the grey disabled
button treatment while the action runs.
```

**Acceptance criteria:**
- [ ] Submitting a valid idea creates the project + run + 3 seeded steps and emits the event.
- [ ] User is routed to the project page where the pipeline is already running.
- [ ] Quota is checked **server-side**; client cannot bypass it.
- [ ] Submit button shows the RawBlock disabled/in-flight treatment during the action.
- [ ] Optional structured fields persist to `idea_meta`.

---

## T-032 — Pipeline Stepper component (live status)

**Priority:** MUST-HAVE
**Dependencies:** T-024, T-002, T-031

**Description:**
Build `src/components/pipeline-status.tsx` implementing the Pipeline Stepper (`FRONTEND-SPEC.md A5.5`) — the app's signature surface. Horizontal step blocks on desktop, vertical stack on mobile, 3px black dividers. Mono uppercase agent labels. States render with border+fill only (no color except status): `pending` (grey), `running` (black fill/white text/5px border + animated mono spinner glyph cycling `| / — \`), `complete` (3px green border, `[x]`), `failed` (3px red border, `[!]`), `skipped` (1px grey, strikethrough). Poll `GET /api/projects/[id]/status` every ~2s; a mono sub-line mirrors the running step ("Researching your market…"). Respect `prefers-reduced-motion` (swap spinner for static `[ ... ]`).

```
Build src/components/pipeline-status.tsx (client). Poll GET /api/projects/[id]/status every
~2s. Render the RawBlock Pipeline Stepper: horizontal on desktop / vertical on mobile, 3px
black dividers, mono uppercase agent labels. Per-step states: pending=white/3px #CCCCCC/grey
text; running=black fill/white text/5px border + animated mono spinner (| / — \); complete=
3px #008000 border + leading [x]; failed=3px #FF0000 border + red text + [!]; skipped=1px
grey border + strikethrough. Below the stepper show a mono sub-line for the current running
agent ("Researching your market…" / "Drafting your PRD…" / "Refining…"). Honor prefers-
reduced-motion: replace the spinner with a static [ ... ]. Stop polling when run status is
complete or failed.
```

**Acceptance criteria:**
- [ ] Stepper reflects live status transitions as the pipeline runs.
- [ ] Running step shows the animated mono spinner + correct sub-line copy.
- [ ] Completed steps show green border + `[x]`; failures show red + `[!]`.
- [ ] Polling stops once the run is `complete`/`failed`.
- [ ] `prefers-reduced-motion` disables the spinner animation.
- [ ] Rotates horizontal→vertical below 768px.

---

## T-033 — PRD viewer (rendered Markdown reading surface)

**Priority:** MUST-HAVE
**Dependencies:** T-032, T-005

**Description:**
Build `src/components/doc-viewer.tsx` and wire it into `(app)/projects/[projectId]/page.tsx` (`FRONTEND-SPEC.md A6.5`). While running, show the Elevated card + stepper (T-032). On completion, show `h2` "PRD READY" + a success status chip, then render the PRD Markdown with `react-markdown` + `remark-gfm` in a reading surface (`max-width: 760px`, body type, links in `#0000FF`). Doc actions row: Secondary "EDIT", Secondary "REGENERATE", Primary "CONTINUE → ADD-ONS".

```
Build src/components/doc-viewer.tsx using react-markdown + remark-gfm, rendered in a 760px
max-width reading surface with RawBlock body type and blue (#0000FF) links only. Wire into
(app)/projects/[projectId]/page.tsx: while the run is active show the Elevated card with the
Pipeline Stepper; on complete show h2 "PRD READY" + success chip + the rendered PRD content
(from documents where type=prd). Add the actions row: Secondary EDIT, Secondary REGENERATE,
Primary "CONTINUE → ADD-ONS" (routes to /addons). Server Component fetches the doc; the
stepper stays client-side.
```

**Acceptance criteria:**
- [ ] Running state shows the stepper; completed state shows the rendered PRD.
- [ ] Markdown renders GFM (tables, lists) correctly at 760px reading width.
- [ ] Hyperlinks are blue/underlined; nothing else uses blue.
- [ ] Actions row present; "CONTINUE → ADD-ONS" navigates to the add-on screen.

---

## T-034 — Doc editor (textarea + live preview) + `editDocument`

**Priority:** MUST-HAVE
**Dependencies:** T-033

**Description:**
Build `src/components/doc-editor.tsx` (`FRONTEND-SPEC.md A6.5`, `TECHNICAL-ARCHITECTURE.md §2` "textarea + preview" choice): split view — mono Textarea on one side, live `react-markdown` preview on the other. Save via Server Action `editDocument({ projectId, docType, content })` which updates `documents.content` and sets `last_edited_by_user=true`. Success fires a toast (toast component from T-061; use a simple inline confirm until then). This editor is reused for every doc type (PRD + add-ons).

```
Build src/components/doc-editor.tsx: a split editor — left = mono textarea bound to the doc
content, right = live react-markdown preview. Add Server Action editDocument({projectId,
docType,content}) in src/actions/projects.ts that updates documents.content and sets
last_edited_by_user=true (scoped to the owner). On save show a success confirmation. Make the
component generic over docType so it serves the PRD and all add-on docs. Toggle between
viewer and editor mode on the project page.
```

**Acceptance criteria:**
- [ ] Editing shows a live preview matching the final rendered output.
- [ ] Save persists content and sets `last_edited_by_user=true`.
- [ ] The same component works for PRD and add-on doc types.
- [ ] Save is scoped to the owner (can't edit another user's doc).

---

## T-035 — Regenerate action + overwrite-warning modal

**Priority:** MUST-HAVE
**Dependencies:** T-034, T-023, T-002

**Description:**
Implement whole-document regeneration (`PRD.md §5.1`, `FRONTEND-SPEC.md A6.5`). "REGENERATE" opens a small Modal (A5.4) with an optional notes Textarea ("focus more on monetization"). If the doc's `last_edited_by_user=true`, first show the "OVERWRITE EDITED DOCUMENT?" warning modal (A5.4) before proceeding. Server Action `regenerate({ projectId, docType?, notes? })` re-emits `project/prd.requested` (or the addon re-run) with `notes`; it overwrites in place (no version history, `PRD.md §9`). Modals: 5px black border, inverted header bar, `Esc`/`[X]` to close, no fade/scale animation.

```
Implement regenerate. Build the RawBlock Modal component (A5.4): 60% black scrim, 5px black
border container, inverted black header bar with white uppercase title + right-flush [X],
Work Sans body, right-flush footer buttons, Esc + [X] to close, NO entrance animation. On
"REGENERATE": if documents.last_edited_by_user is true, first show the "OVERWRITE EDITED
DOCUMENT?" warning modal; otherwise open the regenerate modal with an optional notes textarea.
Server Action regenerate({projectId,docType?,notes?}) re-emits project/prd.requested (or addon
re-run) with notes and overwrites the document in place — no version history. Re-running
resets the relevant pipeline_steps to pending so the stepper re-animates.
```

**Acceptance criteria:**
- [ ] Regenerate re-runs the pipeline and overwrites the existing document.
- [ ] Optional notes are passed to and reflected by the regenerated output.
- [ ] If the doc was hand-edited, the overwrite-warning modal fires first.
- [ ] Modal matches RawBlock (5px border, inverted header, no shadow/animation); `Esc` closes it.
- [ ] Stepper re-animates during regeneration.

---

# EPIC E4 — Add-on Docs & Export

## T-040 — Add-on selection screen

**Priority:** MUST-HAVE
**Dependencies:** T-033, T-002

**Description:**
Build `(app)/projects/[projectId]/addons/page.tsx` (`FRONTEND-SPEC.md A6.6`). `h2` "CHOOSE YOUR DOCS". Four RawBlock Checkboxes in fixed generation order: TECHNICAL / SECURITY / UI-UX / TICKETS. A Tooltip on SECURITY explains the v1 "best-practice, not audit" caveat (`PRD.md §11`). Review-mode radios: "REVIEW EACH DOC AS IT COMPLETES" / "GENERATE ALL, REVIEW AT END" (`PRD.md §6.8`). The UI-UX row expands when checked (reference inputs added in T-042). Primary "GENERATE DOCS" wired to `requestAddons` (T-043).

```
Build (app)/projects/[projectId]/addons/page.tsx: h2 "CHOOSE YOUR DOCS". Four RawBlock
checkboxes in fixed order TECHNICAL / SECURITY / UI-UX / TICKETS (order = generation order).
Add a Tooltip on SECURITY: "In v1 this is best-practice guidance, not a security audit."
Add two radios for review mode: "REVIEW EACH DOC AS IT COMPLETES" vs "GENERATE ALL, REVIEW
AT END". Leave a placeholder region under the UI-UX checkbox that expands when checked (the
reference uploader is a later ticket). Primary Large "GENERATE DOCS" (submit handler stubbed
until requestAddons exists). At least one checkbox must be selected to enable the button.
```

**Acceptance criteria:**
- [ ] Four checkboxes render in the fixed Technical→Security→UI/UX→Tickets order.
- [ ] SECURITY tooltip surfaces the v1 caveat.
- [ ] Review-mode radios are present and mutually exclusive (default: review each).
- [ ] "GENERATE DOCS" is disabled until at least one doc is selected.
- [ ] UI-UX checkbox reveals its expansion region when checked.

---

## T-041 — R2 storage + presigned upload endpoint

**Priority:** MUST-HAVE
**Dependencies:** T-003, T-005

**Description:**
Add `src/lib/storage.ts` (S3-compatible R2 client) and `POST /api/uploads/presign` (`FRONTEND-SPEC.md B5`). The endpoint validates `contentType ∈ image types` and `sizeBytes ≤ MAX_UPLOAD_MB` **server-side**, then returns `{ url, storageKey, expiresIn }` — a short-lived presigned PUT URL. The browser PUTs bytes **directly to R2**; bytes never proxy through the serverless function. Also add a `getObject`/streaming helper for the zip download (T-045).

```
Create src/lib/storage.ts: an S3-compatible client for Cloudflare R2 (R2_* env vars) with
presignPut(key,contentType), getObject(key), and putObject helpers. Add POST
/api/uploads/presign: auth via Clerk; validate contentType is an allowed image type and
sizeBytes <= MAX_UPLOAD_MB; on pass return { url, storageKey, expiresIn } for a short-lived
presigned PUT. Reject invalid type/size with 400. The browser uploads bytes straight to R2
via this URL — never proxy file bytes through the function.
```

**Acceptance criteria:**
- [ ] Presign returns a working short-lived PUT URL for a valid image within size limits.
- [ ] Oversized or non-image requests are rejected server-side with 400.
- [ ] A browser `PUT` to the presigned URL stores the object in R2 (verified) without proxying through the app.
- [ ] `getObject` streaming helper is available for downloads.

---

## T-042 — UI/UX reference uploader + `references`

**Priority:** MUST-HAVE
**Dependencies:** T-041, T-040

**Description:**
Complete the UI-UX expansion row on the add-on screen (`FRONTEND-SPEC.md A6.6`). Repeatable reference-link Input (up to `MAX_REFERENCE_UPLOADS`) and an image upload dropzone (3px dashed black border — dashed is acceptable, still 0px radius). Enforce `MAX_REFERENCE_UPLOADS` / `MAX_UPLOAD_MB` client-side (re-checked server-side in T-041). Flow: presign → PUT to R2 → record a `references` row (Server Action inserting `{ projectId, kind, url|storage_key, note? }`). Link references bypass R2 (stored as `references.url`).

```
Complete the UI-UX reference uploader in the add-ons screen. Repeatable link input (max
MAX_REFERENCE_UPLOADS) storing references rows with kind='link'. Image dropzone with a 3px
dashed black border (0px radius): on drop, call /api/uploads/presign, PUT the file to R2,
then a Server Action inserts a references row {projectId, kind:'image', storageKey, url,
note?}. Enforce max count + max MB client-side. Show uploaded refs as a RawBlock list with a
Destructive remove. Links skip R2 entirely.
```

**Acceptance criteria:**
- [ ] Users can add up to `MAX_REFERENCE_UPLOADS` links and images; the cap is enforced.
- [ ] Image uploads land in R2 and create `references` rows with `storage_key`.
- [ ] Link references create `references` rows with `url` and no R2 object.
- [ ] Dropzone uses a 3px dashed black border, 0px radius, no shadow.
- [ ] References are scoped to the project and removable.

---

## T-043 — `runAddonPipeline` durable function + `requestAddons`

**Priority:** MUST-HAVE
**Dependencies:** T-021, T-022, T-023, T-040

**Description:**
Implement `src/inngest/functions/run-addon-pipeline.ts` triggered by `project/addons.requested` (`TECHNICAL-ARCHITECTURE.md §3.2`). Generate the selected docs in **fixed order** Technical → Security → UI/UX → Tickets, **skipping** unselected ones (mark their `pipeline_steps` `skipped`). Each `step.run` reads the PRD + all previously generated docs **in this run** as context; the UI/UX step also pulls `references` (images passed multimodally, doc/link refs via Mesh RAG). Each produces a `documents` row + updates its `pipeline_step` with cost/latency. Server Action `requestAddons({ projectId, docs, reviewMode, references? })` seeds the addon `pipeline_run` + steps (selected `pending`, unselected `skipped`) and emits the event.

```
Implement src/inngest/functions/run-addon-pipeline.ts on project/addons.requested. Run the
selected docs in FIXED order technical -> security -> ui_ux -> tickets, skipping unselected
(their pipeline_steps = skipped). Each step.run reads the PRD + every prior generated doc in
THIS run as context (the "read everything before me" contract). ui_ux step also loads
references: images passed multimodally, link/doc refs via Mesh RAG vector search with
citations. Each step upserts a documents row (technical/security/ui_ux/tickets) and records
model/tokens/latency on its pipeline_step. Memoize steps. Add Server Action requestAddons
({projectId,docs:string[],reviewMode,references?}) in src/actions/addons.ts: create addon
pipeline_run(kind=addons, requested_docs=docs), seed steps (selected=pending, unselected=
skipped), set project.status=addons_pending, emit the event.
```

**Acceptance criteria:**
- [ ] Selecting a subset generates exactly those docs, in Technical→Security→UI/UX→Tickets order.
- [ ] Unselected docs' steps are marked `skipped` and render struck-through in the stepper.
- [ ] Each agent's context includes the PRD + all previously generated docs from the run.
- [ ] UI/UX agent incorporates uploaded references (RAG citations / multimodal images).
- [ ] Failed/retried steps don't re-run completed ones (memoization).

---

## T-044 — Per-doc review pages

**Priority:** MUST-HAVE
**Dependencies:** T-043, T-034, T-032

**Description:**
Build `(app)/projects/[projectId]/docs/[docType]/page.tsx` (`FRONTEND-SPEC.md A6.7`): the same viewer/editor pattern as the PRD (reuse T-033/T-034), with the doc title in `h3` and per-doc EDIT / REGENERATE. During add-on generation, each doc gets its own stepper entry. Honor the review-mode toggle from T-040: "review each" surfaces each doc as it completes for review before proceeding; "generate all, review at end" runs unattended and lands on the package screen.

```
Build (app)/projects/[projectId]/docs/[docType]/page.tsx reusing doc-viewer + doc-editor.
Title the doc in h3. Show the addon Pipeline Stepper during generation. Provide per-doc EDIT
and REGENERATE (reuse the regenerate flow, scoped to this docType). Respect reviewMode: in
"review each", route the user to each doc as it completes; in "generate all", let the
pipeline run unattended and route to the package screen at the end. All docs read from the
documents table by (projectId, docType).
```

**Acceptance criteria:**
- [ ] Each add-on doc is viewable and editable via the shared viewer/editor.
- [ ] Per-doc regenerate re-runs only that doc (with overwrite warning if hand-edited).
- [ ] "Review each" pauses on each completed doc; "generate all" runs straight through.
- [ ] Stepper shows a distinct entry per selected add-on agent.

---

## T-045 — Zip export (`archiver`, streamed)

**Priority:** MUST-HAVE
**Dependencies:** T-043, T-041

**Description:**
Implement `GET /api/projects/[projectId]/download` (`FRONTEND-SPEC.md B7`, `TECHNICAL-ARCHITECTURE.md §3.2`). Auth-scoped to the owner. Build a `.zip` with `archiver` (streamed, `application/zip`) from all `is_user_facing` documents, mapped to canonical filenames via `src/lib/markdown.ts`: `PRD.md`, `technical-documentation.md`, `security-documentation.md`, `ui-ux-documentation.md`, `tickets.md`. Exclude the internal `research_brief`. Optionally cache the built object in R2. Build the Package Complete screen (`FRONTEND-SPEC.md A6.8`): `h2` "PACKAGE COMPLETE", a List manifest of generated files in mono, Large Primary "DOWNLOAD .ZIP", success toast "ZIP READY".

```
Create GET /api/projects/[projectId]/download: auth-scope to owner; stream an application/zip
built with archiver from all is_user_facing documents, named via src/lib/markdown.ts filename
map (prd->PRD.md, technical->technical-documentation.md, security->security-documentation.md,
ui_ux->ui-ux-documentation.md, tickets->tickets.md). Exclude research_brief. Optionally cache
the zip object in R2. Build the Package Complete screen (A6.8): h2 "PACKAGE COMPLETE", a
RawBlock List manifest of the included filenames in mono, Large Primary "DOWNLOAD .ZIP", and a
"ZIP READY" success toast on completion.
```

**Acceptance criteria:**
- [ ] Downloaded zip contains only selected user-facing docs with the exact canonical filenames.
- [ ] `research_brief` is never included.
- [ ] Zip streams (no memory blow-up on large docs) and opens correctly.
- [ ] Download is owner-scoped (can't download another user's project).
- [ ] Package screen lists the manifest and triggers the download + success toast.

---

# EPIC E5 — Money & Metering

## T-050 — Monthly quota enforcement (`monthly_usage`)

**Priority:** MUST-HAVE
**Dependencies:** T-005, T-031

**Description:**
Add `src/lib/quota.ts` and wire it into `createProject` (T-031). Count against `monthly_usage` for the current calendar month key (`2026-07`), compared to `FREE_PROJECTS_PER_MONTH`. Within limit → increment atomically + proceed. Over limit → return `{ paymentRequired: true }`. Never trust client quota state (`TECHNICAL-ARCHITECTURE.md §3.4`). Abandoned `payment_pending` projects must be excluded from the count (cleanup in T-063). Wire the real quota numbers into the dashboard chip (T-013).

```
Add src/lib/quota.ts: getUsage(userId, period) and checkAndReserve(userId) that reads
monthly_usage for the current calendar-month key (YYYY-MM), compares projects_created to
FREE_PROJECTS_PER_MONTH, and — within limit — atomically increments and returns {allowed:
true}; over limit returns {allowed:false, paymentRequired:true}. Wire into createProject
(replace the stub). Exclude payment_pending projects that were never paid from the count.
Feed real numbers into the dashboard quota chip. Quota is ALWAYS server-side — never trust the
client.
```

**Acceptance criteria:**
- [ ] First project in a month is free; a second returns `paymentRequired`.
- [ ] The counter increment is atomic and race-safe.
- [ ] Quota resets on a new calendar month.
- [ ] Dashboard chip reflects real usage and flips to Warning at the limit.
- [ ] Unpaid `payment_pending` projects don't consume the free slot.

---

## T-051 — Stripe Checkout + `createCheckoutSession`

**Priority:** MUST-HAVE
**Dependencies:** T-050, T-003

**Description:**
Add `src/lib/stripe.ts` and Server Action `createCheckoutSession` in `src/actions/billing.ts` (`FRONTEND-SPEC.md B6`, `TECHNICAL-ARCHITECTURE.md §3.4`). First create a `project` row in `payment_pending` status (so the webhook has something to attach to), then create a one-time (`mode=payment`) Stripe Checkout Session using `STRIPE_PRICE_PER_PROJECT`, with `client_reference_id=projectId`, `success_url`, `cancel_url`. Return `{ checkoutUrl }`. Store/reuse `stripe_customer_id` on the user. Price is loaded from the server, never hardcoded in the client (`PRD.md §10` — exact price TBD).

```
Add src/lib/stripe.ts (Stripe client with STRIPE_SECRET_KEY). Server Action
createCheckoutSession() in src/actions/billing.ts: resolve user (create/reuse stripe_customer_
id), first insert a project row in payment_pending status, then create a Stripe Checkout
Session mode=payment with line_items=[{price:STRIPE_PRICE_PER_PROJECT}], client_reference_id=
projectId, success_url and cancel_url from NEXT_PUBLIC_APP_URL. Return {checkoutUrl}. Never
hardcode price in the client — it comes from the Stripe price object server-side.
```

**Acceptance criteria:**
- [ ] Over-quota "NEW PROJECT" can create a `payment_pending` project + Stripe session.
- [ ] Checkout URL redirects to Stripe's hosted one-time payment page.
- [ ] `client_reference_id` carries the projectId; customer id is stored/reused.
- [ ] Price is never present in client code.

---

## T-052 — Stripe webhook + `payments` reconciliation

**Priority:** MUST-HAVE
**Dependencies:** T-051

**Description:**
Implement `POST /api/webhooks/stripe` (`FRONTEND-SPEC.md B6`). Verify the signature with `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: write a `payments` row (dedup on unique `stripe_checkout_session_id`), flip the linked `project` from `payment_pending` → `draft`, return `200`. Idempotent: duplicate deliveries are no-ops (`TECHNICAL-ARCHITECTURE.md §6.1.8`).

```
Create POST /api/webhooks/stripe. Verify signature with STRIPE_WEBHOOK_SECRET (raw body).
On checkout.session.completed: insert a payments row keyed by the unique
stripe_checkout_session_id (idempotency — duplicate deliveries are no-ops), record
payment_intent id/amount/currency/status=succeeded, look up the project via
client_reference_id and flip payment_pending -> draft. Return 200. Reject invalid signatures
with 400 and write nothing.
```

**Acceptance criteria:**
- [ ] A completed payment creates one `payments` row and unlocks the project (`draft`).
- [ ] Duplicate webhook deliveries are no-ops (unique session id dedupe).
- [ ] Invalid signatures return 400 and write nothing.
- [ ] Verified end-to-end with the Stripe CLI (`stripe listen`).

---

## T-053 — Paywall / checkout modal

**Priority:** MUST-HAVE
**Dependencies:** T-050, T-051, T-035

**Description:**
Build the Paywall modal (`FRONTEND-SPEC.md A6.9`, Modal A5.4). Header "PAYMENT REQUIRED"; body explains the 1 free/month is used and shows the per-project price (loaded from server). Primary "CONTINUE TO CHECKOUT" → `createCheckoutSession` → redirect to Stripe. Triggered when `createProject`/"NEW PROJECT" returns `paymentRequired`. On `success_url` return: success toast "PAYMENT SUCCESSFUL" + intake unlocks; on `cancel_url`: Warning toast "PAYMENT CANCELLED".

```
Build the paywall using the RawBlock Modal. When createProject or the dashboard "NEW PROJECT"
button returns paymentRequired, open a modal: header "PAYMENT REQUIRED", body explaining the
free monthly project is used + the server-loaded per-project price, Primary "CONTINUE TO
CHECKOUT" that calls createCheckoutSession and redirects to checkoutUrl. On return to
success_url show a "PAYMENT SUCCESSFUL" toast and unlock intake; on cancel_url show a Warning
"PAYMENT CANCELLED" toast. Never render a hardcoded price.
```

**Acceptance criteria:**
- [ ] Over-quota actions open the paywall modal instead of routing to intake.
- [ ] Price shown matches the server value; not hardcoded.
- [ ] "CONTINUE TO CHECKOUT" redirects to Stripe; success unlocks a new project.
- [ ] Success/cancel returns show the correct toasts.

---

# EPIC E6 — Hardening & Ops

## T-060 — Sentry error monitoring (FE + BE)

**Priority:** SHOULD-HAVE
**Dependencies:** T-001

**Description:**
Integrate `@sentry/nextjs` across frontend, backend, and Inngest functions (`FRONTEND-SPEC.md B9`). Initialize with `SENTRY_DSN`. **Scrub PII** (idea text can be sensitive) before send. Uncaught render errors surface the RawBlock error card (A6.10) while reporting silently.

```
Integrate @sentry/nextjs for client, server, and Inngest function errors + performance.
Initialize with SENTRY_DSN. Add a beforeSend hook that scrubs PII — especially project idea
text and any user content — before events leave the app. Wrap the app in an error boundary
that renders the RawBlock error card (Elevated card + Secondary RETRY) while reporting the
error to Sentry silently.
```

**Acceptance criteria:**
- [ ] Thrown client/server errors appear in Sentry with stack traces.
- [ ] Idea text / user content is scrubbed from error payloads.
- [ ] Uncaught render errors show the RawBlock error card, not a white screen.

---

## T-061 — Toasts + failed-state UI

**Priority:** SHOULD-HAVE
**Dependencies:** T-002, T-024

**Description:**
Build the Toast component (`FRONTEND-SPEC.md A5.10`): inverted block (black fill/white text, Space Mono 14px, 3px black border, no shadow), top-right stack, auto-dismiss 4s, manual `[X]`; error toasts add a 5px `#FF0000` left accent. Use for "DOCUMENT SAVED", "ZIP READY", "PAYMENT SUCCESSFUL/CANCELLED". Also build the failed-pipeline UI (`FRONTEND-SPEC.md A6.10`): the failed stepper block state + an Elevated error card with Secondary "RETRY" that re-emits the run (Inngest memoization means completed steps aren't re-paid).

```
Build the RawBlock Toast (A5.10): inverted black/white block, Space Mono 14px, 3px black
border, no shadow, top-right stack, auto-dismiss 4s + manual [X]; error variant adds a 5px
#FF0000 left accent. Provide a toast() API used by save/download/payment flows. Also build the
failed-pipeline UI (A6.10): when a step fails, the stepper block shows the failed state and an
Elevated card shows the error + a Secondary "RETRY" that re-emits the run (memoized steps
aren't re-run/re-paid).
```

**Acceptance criteria:**
- [ ] Toasts appear top-right, auto-dismiss in 4s, and are manually closable.
- [ ] Error toasts show the red left accent.
- [ ] A failed pipeline shows the failed stepper state + error card + working RETRY.
- [ ] RETRY resumes without re-running already-complete steps.

---

## T-062 — Test-idea eval suite (+ optional Langfuse)

**Priority:** SHOULD-HAVE
**Dependencies:** T-021

**Description:**
Because `agents/` has no Next.js deps, build a standalone eval harness that runs a curated "test-idea suite" through the pipeline and scores outputs against a rubric (`PRD.md §11`, `TECHNICAL-ARCHITECTURE.md §7`) — for catching prompt regressions before shipping. Optionally wire Langfuse (`FRONTEND-SPEC.md B10`) for step-level traces + eval scoring. Skippable for a pure hackathon build, but valuable for the "output quality consistency" risk.

```
Build a standalone eval harness (no Next.js) that runs a curated set of test ideas through
the agents/ pipeline and scores each generated doc against a quality rubric (required
sections present, no boilerplate must-haves, metrics filled in). Output a pass/score report
so prompt changes can be checked in CI before shipping. Optionally initialize Langfuse
(LANGFUSE_* env) in run-agent.ts to capture per-step traces + attach eval scores. Keep it
runnable via `npm run eval`.
```

**Acceptance criteria:**
- [ ] `npm run eval` runs the test-idea suite through the real agents and prints scores.
- [ ] The rubric flags missing sections / boilerplate / empty metrics.
- [ ] (If enabled) Langfuse shows per-step traces with scores.

---

## T-063 — Abandoned `payment_pending` cleanup (Inngest cron)

**Priority:** SHOULD-HAVE
**Dependencies:** T-051, T-050

**Description:**
Add an Inngest cron function (`TECHNICAL-ARCHITECTURE.md §8.6`) that garbage-collects `payment_pending` projects older than a threshold (e.g. 24h) that never received a successful payment, so abandoned checkouts don't consume the free monthly slot or clutter the dashboard (`TECHNICAL-ARCHITECTURE.md §5.10`).

```
Add an Inngest scheduled (cron) function that periodically deletes or archives projects stuck
in payment_pending older than 24h with no succeeded payment row. Ensure the quota counter
never counts these. Log how many were cleaned. Idempotent and safe to run frequently.
```

**Acceptance criteria:**
- [ ] Stale `payment_pending` projects (>24h, unpaid) are cleaned on schedule.
- [ ] Cleaned projects never counted against quota.
- [ ] Paid or recent pending projects are untouched.

---

## T-064 — Transactional email (Resend)

**Priority:** SHOULD-HAVE
**Dependencies:** T-043

**Description:**
Add `src/lib/` Resend integration (`FRONTEND-SPEC.md B8`) sending receipts and a "your docs are ready" notification — relevant to the unattended "generate all, review at end" flow. React Email templates. Backend-only; no frontend contact. Optionally gate the "ready" email behind an in-app "email me when ready" flag.

```
Integrate Resend for transactional email (RESEND_API_KEY, EMAIL_FROM). Send: (1) a payment
receipt after a successful Stripe charge, (2) a "your docs are ready" email when an addon
pipeline finishes in "generate all, review at end" mode. Use React Email templates. All sends
are server-side (from the webhook / Inngest function). Optionally read an "email me when
ready" flag set on the project.
```

**Acceptance criteria:**
- [ ] A completed unattended pipeline sends a "docs ready" email.
- [ ] A successful payment sends a receipt.
- [ ] Emails render from React Email templates; no client involvement.

---

## T-065 — Free-tier abuse guardrails

**Priority:** SHOULD-HAVE
**Dependencies:** T-050, T-020

**Description:**
Layer basic abuse mitigation (`PRD.md §11`, `TECHNICAL-ARCHITECTURE.md §7`): rely on Clerk email verification + bot signals; add IP/device rate-limiting at the Server Action layer; and confirm a **Mesh per-key spend cap** (+ RPM/RPD/TPM) is set as the hard budget backstop even if app quota logic is bypassed. Consider a separate Mesh key scoped for free-tier traffic vs paid for clean cost attribution.

```
Add free-tier abuse guardrails: (1) require Clerk email verification before project creation;
(2) rate-limit createProject / createCheckoutSession by user + IP at the Server Action layer;
(3) document + verify a Mesh per-key spend cap and RPM/RPD/TPM as the hard budget backstop;
(4) optionally use a separate Mesh API key for free-tier traffic for cost attribution. Never
trust client-side quota state.
```

**Acceptance criteria:**
- [ ] Unverified accounts can't create projects.
- [ ] Rapid repeat project/checkout attempts are rate-limited.
- [ ] A Mesh spend cap is configured and documented as the final backstop.

---

# EPIC E7 — Post-MVP (Deferred, Not for Launch)

> Listed for backlog continuity. All are **NICE-TO-HAVE** and explicitly **out of scope for v1** per `PRD.md §5.2 / §9`. Do **not** build these for launch.

| Ticket | Feature | Notes |
|---|---|---|
| **T-070** | Section-level regeneration | Regenerate one section instead of the whole doc (`PRD.md §9`). |
| **T-071** | In-app chat refinement | Conversational follow-up vs edit/regenerate only. |
| **T-072** | Templates/presets | Starter idea templates per app category. |
| **T-073** | Multiple export formats | PDF + Notion-import in addition to Markdown/zip. |
| **T-074** | Team/workspace sharing | Invite collaborators to view/comment. |
| **T-075** | Direct integrations | Push Tickets to Jira/Linear/Trello. |
| **T-076** | Version history / rollback | Diff + restore prior doc versions (needs `document_revisions` table). |
| **T-077** | Model/agent choice | Let advanced users pick the model per agent. |
| **T-078** | User usage analytics | Personal generation-history dashboard. |

---

## Dependency Map (Critical Path)

```
T-001 ─┬─ T-002 ─────────────────────────────── (all UI tickets)
       ├─ T-003 ─┬─ T-004 ── T-005 ──────────── (all data tickets)
       │         └─ T-020 ── T-021 ── T-023 ── T-024 ── T-032/033
       └─ T-010 ─┬─ T-011
                 ├─ T-012
                 └─ T-013 ── T-030 ── T-031 ── T-032 ── T-033 ── T-034 ── T-035
                                                                             │
                                        T-040 ── T-041 ── T-042 ── T-043 ── T-044 ── T-045
                                                                             │
                                        T-050 ── T-051 ── T-052 ── T-053
```

**Minimum demoable alpha:** T-001 → T-005, T-010 → T-013, T-020 → T-024, T-030 → T-035 (idea → live pipeline → editable PRD).
**Full MVP:** + E4 (add-ons + export) + E5 (money) + the SHOULD-HAVE items in E6.

---

*Derived from `PRD.md`, `FRONTEND-SPEC.md`, and `TECHNICAL-ARCHITECTURE.md`. Each ticket is self-contained and paste-ready for an AI coding tool. Priorities: MUST-HAVE = launch blocker; SHOULD-HAVE = pre-launch, can slip to fast-follow; NICE-TO-HAVE = post-MVP.*
