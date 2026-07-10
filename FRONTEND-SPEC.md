# Frontend Specification Document

## Spec0 — Idea → PRD → Docs Package (Multi-Agent Pipeline SaaS)

| Field | Detail |
|---|---|
| Document Owner | Founder / Design + Frontend |
| Status | Draft v1.0 |
| Last Updated | July 10, 2026 |
| Source | Derived from `PRD.md`, `TECHNICAL-ARCHITECTURE.md`, `DESIGN.md` |
| Design language | **RawBlock** (brutalist) — carried verbatim from `DESIGN.md`, extended only where the app needs a component the source system didn't define (modals, steppers, toasts). |

---

## 0. How to Read This Document

This spec has two halves:

- **Part A — Design System.** The complete RawBlock visual language expressed as build-ready tokens and component specs, then mapped screen-by-screen onto every surface in the PRD user flow. The theme is unchanged; where `DESIGN.md` was silent (modals, the pipeline stepper, toasts, empty states), the new components are derived **strictly from RawBlock's existing rules** — thick borders, 0px radius, no shadows, full-inversion interactions, uppercase+tracking on controls.
- **Part B — API & Integration Spec.** Every third-party service the app touches: what it does, which endpoints are called, what data is sent, and what response is expected — separated into **frontend-facing** calls and **backend-only** calls, plus the app's own internal API contract that the frontend consumes.

Two hard rules govern everything below, taken from `DESIGN.md`:

1. **0px border radius, everywhere, no exceptions** (the single exception is the radio button's inner circle).
2. **No shadows, ever.** Hierarchy comes from border weight (1px / 3px / 5px) and scale contrast only.

---

# PART A — DESIGN SYSTEM (RawBlock)

## A1. Design Principles

RawBlock strips the interface to its structural bones. For Spec0 specifically, this aesthetic is a feature, not just a style: the product outputs raw Markdown documents, and a brutalist, "assembled-from-HTML-primitives" shell reinforces that the tool is a no-nonsense **document machine**, not a polished consumer toy.

| # | Principle | How it shows up in Spec0 |
|---|---|---|
| 1 | Thick borders are the only organizer | Cards, inputs, modals, the pipeline stepper — all separated by 3px/5px black rules, never shadows. |
| 2 | Full color inversion on interaction | Buttons, list rows, chips flip black↔white on hover/active. |
| 3 | Type does the heavy lifting | Archivo Black at 32–64px for page titles and pipeline status; no decorative imagery. |
| 4 | Blue is reserved for hyperlinks only | `#0000FF` never appears on buttons, chips, or status — links only. |
| 5 | Intentional spacing irregularity | Asymmetric layouts allowed; the spacing scale is a starting point, broken deliberately. |
| 6 | Disabled = lighter borders + grey fill, never opacity | Quota-locked buttons, in-flight forms use `#CCCCCC` borders + grey fills. |

---

## A2. Color Palette

Carried verbatim from `DESIGN.md`. Expressed here as named tokens for implementation (Tailwind config / CSS variables).

| Token | Hex | Role |
|---|---|---|
| `--color-black` | `#000000` | Text, borders, fills |
| `--color-white` | `#FFFFFF` | Background, inverse text |
| `--color-blue` | `#0000FF` | **Links only** (hyperlink blue / Info) |
| `--surface-base` | `#FFFFFF` | App background |
| `--surface-inverted` | `#000000` | Inverted sections (modal header bar, tooltips, active rows) |
| `--surface-sunken` | `#F0F0F0` | Input fill |
| `--surface-hover-input` | `#E8E8E8` | Input hover fill |
| `--surface-disabled` | `#F5F5F5` | Disabled input/control fill |
| `--border-disabled` | `#CCCCCC` | Disabled border color |
| `--content-primary` | `#000000` | Primary text |
| `--content-secondary` | `#000000` (used at helper scale) | Secondary/helper text |
| `--content-tertiary` | `#CCCCCC`-range grey | Disabled text |
| `--color-success` | `#008000` | Success (pure green) |
| `--color-warning` | `#FFA500` | Warning (pure orange) |
| `--color-error` | `#FF0000` | Error (pure red) |
| `--color-info` | `#0000FF` | Info (same as link blue) |

**Semantic mapping for Spec0 pipeline states** (status chips + stepper, using the reserved status colors — never blue for anything but links):

| Pipeline/doc state | Color | Token |
|---|---|---|
| `complete` / `ready` / `succeeded` | Green | `--color-success` |
| `running` / `generating` / `pending` | Black | `--color-black` (in-progress uses black + motion, not color) |
| `failed` / payment error | Red | `--color-error` |
| `payment_pending` / quota warning | Orange | `--color-warning` |

---

## A3. Typography

Fonts (self-host or load once; no external CDN dependence for the shell):

- **Headline:** Archivo Black
- **Body:** Work Sans
- **Mono:** Space Mono

| Style | Font | Size | Weight | Line height | Usage in Spec0 |
|---|---|---|---|---|---|
| `h1` | Archivo Black | 64px | regular | 1.0 | Landing hero, dashboard title |
| `h2` | Archivo Black | 48px | regular | 1.05 | Section headers, "PRD READY" |
| `h3` | Archivo Black | 32px | regular | 1.1 | Card titles, modal header text |
| `h4` | Work Sans | 22px | semibold | 1.2 | Sub-section headers, doc titles |
| `body` | Work Sans | 16px | regular | 1.6 | Paragraph copy, rendered PRD body |
| `small` | Work Sans | 14px | regular | 1.5 | Metadata, captions |
| `tiny` | Work Sans | 12px | regular | 1.4 | Helper text, footnotes |
| `mono` | Space Mono | 15px | regular | 1.5 | Input text, code, filenames, token/cost readouts |

**Type rules specific to controls:** buttons and labels are **uppercase with 2px (buttons) / letter-spacing tracking**, per RawBlock. Labels use Archivo Black 14px uppercase.

---

## A4. Spacing & Layout Rules

Base unit **8px**, used intentionally irregularly. Scale:

| Token | px |
|---|---|
| `sp-1` | 4 |
| `sp-2` | 8 |
| `sp-3` | 16 |
| `sp-4` | 24 |
| `sp-5` | 40 |
| `sp-6` | 64 |
| `sp-7` | 80 |
| `sp-8` | 120 |

**Layout rules:**

- **Grid:** 12-column fluid grid, `max-width: 1200px` for app content, `max-width: 760px` for reading surfaces (rendered docs). No centered "card float" look — content blocks butt up against thick borders and the viewport edge where it reinforces the raw feel.
- **App shell:** persistent top nav bar (3px bottom border, black), left-flush wordmark in Archivo Black, right-flush `<UserButton/>` and quota counter. No sidebar in v1.
- **Vertical rhythm:** `sp-5` (40px) between major sections; `sp-3`/`sp-4` inside cards. Deliberately asymmetric outer margins are allowed on marketing pages.
- **Border weights:** `border-thin` 1px, `border-thick` 3px (default for most components), `border-heavy` 5px (elevated cards, focus states, modals, active buttons).
- **Elevation:** none. Never introduce `box-shadow`. If two surfaces need separation, thicken the border or invert one.
- **Responsive:** single-column stack below 768px; the pipeline stepper rotates from horizontal to vertical; modals go full-bleed (100% width, still 5px border, edge-to-edge).

---

## A5. Core Components

### A5.1 Buttons

Carried from `DESIGN.md`. Square, uppercase, 2px tracking.

| Variant | Fill | Text | Border | Hover | Active |
|---|---|---|---|---|---|
| **Primary** | `#000000` | `#FFFFFF` | 3px black | full inversion → white fill, black text | black fill, white text, **5px** border |
| **Secondary** | `#FFFFFF` | `#000000` | 3px black | black fill, white text | (inverts, 5px border) |
| **Ghost** | transparent | `#000000`, underlined | none | text → blue `#0000FF` | — |
| **Destructive** | `#FF0000` | `#FFFFFF` | 3px black | black fill, error text | — |

**Sizes** (`padding`, `font-size`, `height`):
- Small — `6px 16px`, 12px, 32px
- Medium — `10px 24px`, 14px, 44px
- Large — `16px 40px`, 18px, 56px

**Disabled:** `--surface-sunken` fill, `--content-tertiary` text, 3px `#CCCCCC` border, `cursor: not-allowed`. Never opacity.

> **Spec0 usage:** Primary = "GENERATE PRD", "GENERATE DOCS", "DOWNLOAD .ZIP". Secondary = "REGENERATE", "EDIT". Ghost = inline links like "add note". Destructive = "DISCARD" / "DELETE PROJECT". The Ghost hover-to-blue is the *only* place blue appears on a control, and only because it behaves like a link.

### A5.2 Inputs

`--surface-sunken` (`#F0F0F0`) fill, `--content-primary` text, 3px black border, square, **Space Mono 15px**, `10px/12px` padding.

| State | Spec |
|---|---|
| Default | 3px black border |
| Hover | 3px black border, background `#E8E8E8` |
| Focus | **5px** black border, `outline: none` |
| Error | 3px error `#FF0000` border |
| Disabled | 3px `#CCCCCC` border, background `#F5F5F5` |

- **Label:** Archivo Black 14px uppercase, `margin-bottom: 4px`.
- **Helper text:** Work Sans 12px; secondary by default, `#FF0000` in error state; `margin-top: 4px`.

> **Spec0 usage:** the idea-intake textarea (multi-line, min 8 rows), optional structured prompt fields (problem / audience / scope), the reference-link input, and the regeneration-notes field. All use the mono input treatment.

### A5.3 Cards

| Variant | Spec |
|---|---|
| **Default** | white fill, 3px black border, square, no shadow, `sp-4` (24px) padding |
| **Elevated** | white fill, **5px** black border, square, no shadow, `sp-4` padding — heavier border signals more importance |

> **Spec0 usage:** Default card = project row on the dashboard, each doc tile on the package screen. Elevated card = the currently-active pipeline panel and the "PRD READY" result block.

### A5.4 Modals *(new — derived from RawBlock rules)*

`DESIGN.md` does not define modals; Spec0 needs them (paywall/checkout confirm, "overwrite hand-edited doc?" warning, delete confirmation). Specification, built strictly from RawBlock primitives:

- **Backdrop:** solid black scrim at 60% (`rgba(0,0,0,0.6)`). This is overlay dimming, not a disabled-state opacity, so it does not violate the "no opacity for disabled" rule.
- **Container:** white fill, **5px black border** (matches Elevated card = maximum importance), square, **no shadow**, `max-width: 560px`, `sp-5` (40px) body padding. On mobile: full-bleed width, 5px border retained.
- **Header bar:** **inverted block** echoing the tooltip treatment — `#000000` fill, `#FFFFFF` text, Archivo Black ~20–24px uppercase, `sp-3` padding. A square `[X]` close control sits right-flush (white on black; hover inverts to black-on-white with a 3px white→black border swap).
- **Body:** Work Sans 16px, `line-height: 1.6`.
- **Footer:** buttons right-flush, `sp-3` gap. Primary action on the right, Secondary/Ghost cancel to its left. On destructive modals the confirm button is the Destructive variant.
- **Focus trap + `Esc` to close** (except blocking states like an in-flight payment). No entrance animation beyond an instant appear or a 1-frame hard cut — no fades, no scale-in (polish is against the system).

```
┌───────────────────────────────────────────┐   ← 5px black border
│██ OVERWRITE EDITED DOCUMENT?          [X]██│   ← inverted header bar
├───────────────────────────────────────────┤
│                                             │
│  You hand-edited this document. Regenerating│
│  will replace your changes. Version history │
│  is not kept in v1.                         │
│                                             │
│                     [ CANCEL ] [ REGENERATE ]│
└───────────────────────────────────────────┘
```

### A5.5 Pipeline Stepper *(new — derived from RawBlock rules)*

The live per-agent status indicator (PRD §5.1 "Researching… / Drafting… / Refining…") is the app's signature surface. Built from list + status-chip primitives:

- **Layout:** horizontal row of step blocks on desktop, vertical stack on mobile. Steps separated by 3px black dividers.
- **Step block:** square, `sp-3` padding, mono label for the agent name (`RESEARCH`, `DRAFT`, `REFINE`, `TECHNICAL`, …) uppercase.
- **States (border + fill only, no color except status):**
  - `pending` — white fill, 3px `#CCCCCC` border, grey text.
  - `running` — **black fill, white text, 5px black border**, plus an animated mono spinner glyph (e.g. cycling `|` `/` `—` `\` in Space Mono) — motion, not color, signals activity.
  - `complete` — white fill, 3px `#008000` (success) border, black text, leading `[x]` check glyph.
  - `failed` — white fill, 3px `#FF0000` border, red text, leading `[!]`.
  - `skipped` — white fill, 1px `#CCCCCC` border, strikethrough label.
- Backed by the `pipeline_steps` table via the status endpoint (see Part B / §B7).

### A5.6 Chips

**Filter chip:** white fill, black text, 2px black border, square, `4px/12px` padding, uppercase 10px, 1px tracking. Active → black fill, white text.

**Status chip** (square, 2px colored border, 11px semibold uppercase, 1px tracking, `2px/10px` padding):

| Status | Fill | Text | Border |
|---|---|---|---|
| Active/Success | `#FFFFFF` | `#008000` | `#008000` |
| Warning | `#FFFFFF` | `#FFA500` | `#FFA500` |
| Error | `#FFFFFF` | `#FF0000` | `#FF0000` |
| Default | `#FFFFFF` | `#000000` | `#000000` |

> **Spec0 usage:** dashboard project status ("PRD ONLY" / "FULL PACKAGE" / "FAILED" / "PAYMENT PENDING"); add-on selection uses filter chips OR checkboxes (see A5.8).

### A5.7 Lists

Transparent, Work Sans 16px, 3px black divider between items, `12px 0px` item padding. Hover → underline. Active → black fill, white text, full-width. Text only, no trailing icons.

> **Spec0 usage:** dashboard project list, the generated-docs manifest on the package screen.

### A5.8 Checkboxes & Radios

- **Checkbox:** 20×20px, 3px black border, square. Unchecked white; checked black fill with white 3px-stroke check. Focus → 5px border. Disabled → `#CCCCCC` border, `#F5F5F5` fill.
- **Radio:** 20×20px, 3px black border, **circle** (the single 0px-radius exception). Selected → black border + 10px black inner dot. Focus → 5px border.

> **Spec0 usage:** the add-on selection screen (Technical / Security / UI-UX / Tickets) uses checkboxes — any subset. The "review each doc as it completes" vs "generate all, review at end" toggle (PRD §6.8) is a pair of radios.

### A5.9 Tooltips

Black fill, white text, Space Mono 13px, square, no border, no shadow, `8px/12px` padding, no arrow (positioned directly adjacent), 260px max width.

> **Spec0 usage:** the "why is the Security doc generic in v1?" hint on the add-on screen (PRD §11); token/cost readouts on hover.

### A5.10 Toasts *(new — derived from tooltip/inverted treatment)*

For transient confirmations ("DOCUMENT SAVED", "ZIP READY", "PAYMENT SUCCESSFUL"):

- Inverted block: black fill, white text, Space Mono 14px, square, **no shadow**, 3px black border (so it reads on white edges), `sp-3` padding.
- Top-right stack, auto-dismiss 4s, manual `[X]`. Error toasts swap the left 5px accent rule to `#FF0000`.

---

## A6. Screen-by-Screen Application

Every surface from the PRD user flow (§6), mapped to the components above. All screens sit inside the app shell (top nav, 3px bottom border) except marketing and auth.

### A6.1 Marketing / Landing (`/`)
- `h1` Archivo Black 64px hero headline; body Work Sans; a single Primary CTA "START FREE". No hero imagery (Don't #9). Asymmetric layout encouraged.

### A6.2 Auth (`/sign-in`, `/sign-up`)
- Clerk prebuilt components, **restyled to RawBlock** via Clerk `appearance` API: square inputs, 3px black borders, black Primary button, Archivo Black headings, no shadows. (Integration in §B2.)

### A6.3 Dashboard (`/dashboard`)
- `h2` "YOUR PROJECTS".
- **Quota counter**: a status chip — `PROJECTS THIS MONTH: 0/1 FREE` (Default chip); flips to Warning chip when at limit.
- **Primary button** "NEW PROJECT" (Large). If over quota, it opens the paywall modal instead of routing.
- **Project list**: List component; each row shows title, a status chip (PRD ONLY / FULL PACKAGE / FAILED), and a Ghost "download" link. Row hover underlines; active row inverts.
- **Empty state**: mono line `> no projects yet. describe an idea to begin.`

### A6.4 Idea Intake (`/projects/new`)
- `h2` "DESCRIBE YOUR IDEA".
- Large mono **textarea** (Input, min 8 rows) + three optional structured Inputs (PROBLEM / AUDIENCE / ROUGH SCOPE) with uppercase Archivo Black labels.
- Primary "GENERATE PRD" (Large). On submit, quota is checked server-side (§B7); disabled state shows the grey/`#CCCCCC` treatment while the Server Action runs.

### A6.5 Pipeline Status + PRD Viewer (`/projects/[projectId]`)
- **While running:** Elevated card containing the **Pipeline Stepper** (A5.5) with `RESEARCH → DRAFT → REFINE`. A mono sub-line mirrors the running step ("Researching your market…"). Polls the status endpoint every ~2s (§B7).
- **On complete:** `h2` "PRD READY" + a status chip. The rendered Markdown appears in a reading surface (`max-width: 760px`, body type, links in `#0000FF`).
- **Doc actions row:** Secondary "EDIT", Secondary "REGENERATE" (opens a small modal to optionally add notes; if the doc was hand-edited, the overwrite-warning modal A5.4 fires first), Primary "CONTINUE → ADD-ONS".
- **Editor mode** (`doc-editor.tsx`): split textarea (mono) + live preview, per Technical Architecture's "textarea + preview" choice. Save = Server Action; success toast.

### A6.6 Add-on Selection (`/projects/[projectId]/addons`)
- `h2` "CHOOSE YOUR DOCS".
- Four **checkboxes**: TECHNICAL / SECURITY / UI-UX / TICKETS. Order shown matches the fixed generation order (Technical → Security → UI/UX → Tickets).
- **UI/UX row** expands when checked: a reference-link Input (repeatable, up to `MAX_REFERENCE_UPLOADS`) and an image **upload** dropzone (3px dashed black border — dashed is acceptable as a border treatment, still 0px radius). Uploads go straight to R2 via presigned URL (§B5).
- A **tooltip** on SECURITY explains the v1 "best-practice, not audit" caveat (PRD §11).
- **Review toggle:** two radios — "REVIEW EACH DOC AS IT COMPLETES" / "GENERATE ALL, REVIEW AT END" (PRD §6.8).
- Primary "GENERATE DOCS".

### A6.7 Per-Doc Review (`/projects/[projectId]/docs/[docType]`)
- Same viewer/editor pattern as the PRD (A6.5). Each doc gets its own stepper entry during generation. Doc title in `h3`.

### A6.8 Package Complete
- `h2` "PACKAGE COMPLETE".
- A List manifest of generated files with their export filenames in mono (`PRD.md`, `technical-documentation.md`, `security-documentation.md`, `ui-ux-documentation.md`, `tickets.md`).
- Primary Large "DOWNLOAD .ZIP" → streams from the download endpoint (§B7). Success toast "ZIP READY".

### A6.9 Paywall / Checkout Modal
- Modal (A5.4). Header "PAYMENT REQUIRED". Body explains 1 free project/month is used; shows the per-project price (loaded from server; PRD §10 marks exact price TBD). Primary "CONTINUE TO CHECKOUT" → redirects to Stripe Checkout (§B6). On return, a success toast and the intake screen unlocks.

### A6.10 Error / Failed States
- Failed pipeline step → the stepper block turns to the `failed` state; an Elevated card shows the error and a Secondary "RETRY" (re-emits the run; Inngest memoization means completed steps aren't re-paid, §B4). Global uncaught errors report to Sentry (§B9).

---

## A7. Accessibility & Motion Notes

- **Contrast:** black-on-white and white-on-black are the workhorses (21:1) — trivially AA/AAA. The one caution: status colors on white (green `#008000` ≈ 5.1:1 passes; orange `#FFA500` on white fails text contrast, so it is used **only for borders/large glyphs, never small body text**).
- **Focus:** the 5px-border focus state doubles as the visible focus ring — keep it on keyboard focus, never suppress `outline` without the 5px substitute.
- **Motion:** the only animation is the mono spinner glyph on `running` steps and toast entry. Respect `prefers-reduced-motion` by swapping the spinner for a static `[ ... ]`.
- **Links:** `#0000FF`, underlined, only for genuine navigation/hyperlinks — never repurposed for UI accents.

---

# PART B — API & INTEGRATION SPEC

This half documents **every third-party service** in `TECHNICAL-ARCHITECTURE.md §2`, plus the app's own internal API that the frontend consumes. For each external service: **what it does**, **which endpoints are called**, **what data is sent**, and **what response is expected**.

**Critical architecture note for the frontend:** the heavy LLM work (Mesh) and orchestration (Inngest) are **backend-only** — the browser never calls them directly. The frontend's job is to (a) use a few client SDKs (Clerk, Stripe.js, Sentry), (b) `PUT` files to a presigned R2 URL, and (c) talk to the app's **own** Route Handlers and Server Actions, which in turn talk to everything else. Services are tagged **[FE]** (frontend touches it directly), **[BE]** (backend only), or **[FE→BE]** (frontend triggers it through our own API).

| Service | Role | Frontend contact |
|---|---|---|
| Clerk | Auth & user identity | **[FE]** SDK + hosted UI |
| Mesh API | LLM gateway (all agents, web search, RAG) | **[BE]** only |
| Inngest | Durable pipeline orchestration | **[BE]** (frontend polls our status API) |
| Neon Postgres (via Drizzle) | System-of-record DB | **[BE]** only |
| Cloudflare R2 | Reference-image + zip storage | **[FE→BE]** presign, then **[FE]** direct PUT |
| Stripe | One-time payments | **[FE]** Stripe.js redirect + **[BE]** webhook |
| Resend | Transactional email | **[BE]** only |
| Sentry | Error monitoring | **[FE]** + **[BE]** SDK |
| Langfuse (optional) | Prompt-quality tracing | **[BE]** only |

---

## B1. Base URLs & Auth Summary

| Service | Base URL | Auth mechanism | Key/secret (env) |
|---|---|---|---|
| Clerk (Frontend API) | `https://<subdomain>.clerk.accounts.dev` (or `clerk.<yourdomain>`) | Publishable key (browser) + session JWT | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` |
| Mesh API | `https://api.meshapi.ai/v1` | `Authorization: Bearer rsk_...` | `MESH_API_KEY` |
| Inngest | Inngest Cloud (event ingest) + our `/api/inngest` serve route | Event key + signing key | `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` |
| Neon | `postgres://…neon.tech/spec0` | Postgres connection string (pooled for app, direct for migrations) | `DATABASE_URL` / `DIRECT_DATABASE_URL` |
| Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` (S3-compatible) + presigned URLs | S3 SigV4 (server signs); browser uses short-lived presigned URL | `R2_*` |
| Stripe | `https://api.stripe.com` | `Authorization: Bearer sk_...` (server) + publishable key (browser) | `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Resend | `https://api.resend.com` | `Authorization: Bearer re_...` | `RESEND_API_KEY` |
| Sentry | Sentry ingest (DSN host) | DSN (public) | `SENTRY_DSN` |
| Langfuse | `https://cloud.langfuse.com` | public + secret key | `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` |

---

## B2. Clerk — Authentication & Identity **[FE]**

**What it does:** Handles signup/login (email + OAuth), session management, and provides a stable `userId`. Also supplies bot/abuse signals that back the free-tier-abuse mitigation (PRD §11). Everything the user owns is keyed off the mirrored `users.clerk_id`.

**How the frontend uses it:**
- `<ClerkProvider>` wraps the root layout.
- Hosted, restyled components on the auth routes: `<SignIn/>`, `<SignUp/>`. Styling via the `appearance` prop to enforce RawBlock (square, 3px borders, black buttons, no shadow).
- `<UserButton/>` in the top nav.
- Client hooks: `useUser()` (display email/name), `useAuth()` → `getToken()` for authenticated calls where needed.

**Endpoints called:**

| Direction | Endpoint | Data sent | Expected response |
|---|---|---|---|
| Browser → Clerk FAPI | `POST /v1/client/sign_ins`, `/v1/client/sign_ups` (handled internally by Clerk components) | Email/password or OAuth grant | Session object + JWT set as a Clerk session cookie |
| Browser → Clerk | `getToken()` | — | Short-lived JWT for our API calls |
| Clerk → our app (webhook) | `POST /api/webhooks/clerk` | Svix-signed event `user.created` / `user.updated` (id, email) | We verify the Svix signature (`CLERK_WEBHOOK_SECRET`), upsert a `users` row (`clerk_id`, `email`), return `200` |

**Server-side:** `auth()` / `currentUser()` from `@clerk/nextjs/server` in Server Actions and Route Handlers gate every mutation and read by the authenticated `clerk_id`.

**Failure handling (frontend):** Clerk components render their own error states — restyle them to RawBlock error inputs (3px red border, error helper text). A missing/expired session redirects to `/sign-in`.

---

## B3. Mesh API — LLM Gateway **[BE only]**

**What it does:** The single model layer for all seven agents. One OpenAI-compatible endpoint routes to 1000+ models and bundles web search, RAG, audit logs, per-key spend caps, and <100ms failover. **The browser never calls Mesh** — only the `agents/` module (invoked inside Inngest steps) does. Documented here because it defines the shape of the content the frontend renders.

**Base:** `https://api.meshapi.ai/v1` — `Authorization: Bearer rsk_...`. Called via the Vercel AI SDK's OpenAI-compatible provider with `baseURL` pointed at Mesh.

**Endpoints called (server-side):**

| Purpose | Endpoint | Data sent | Expected response |
|---|---|---|---|
| Run an agent (chat completion) | `POST /v1/chat/completions` | `{ model: "anthropic/claude-opus-4-8" \| "anthropic/claude-sonnet-5" \| "google/gemini-flash" …, messages: [...], response_format?: { type: "json_schema", json_schema }, tools?, stream?: bool }` — plus web-search enablement on the Research call | OpenAI chat-completion object: `{ id, choices: [{ message: { content \| tool_calls } }], usage: { prompt_tokens, completion_tokens, total_tokens } }`. `usage` is mirrored into `pipeline_steps` for cost tracking. |
| Structured output (research brief, tickets) | same endpoint + `response_format: json_schema` | JSON schema for the brief / ticket list | Validated JSON object (SDK retries on schema mismatch) |
| Research web search | same endpoint, web search enabled | research prompt + search toggle | Completion grounded in fresh web results |
| RAG: upload UI/UX reference docs | Mesh RAG flow: **Init Upload → Trigger Embedding → Vector Search** | reference PDF/DOCX/CSV; then query at UI/UX step | Chunked/embedded doc; vector-search returns grounded, **cited** snippets |

**Model mapping (from `agents/config.ts`, env-overridable):** Research/Draft/Add-ons → `claude-sonnet-5`; Refine (quality gate) → `claude-opus-4-8`; light steps → `gemini-flash` or Mesh auto-routing. Exact IDs must be confirmed on the Mesh "Models" page.

**Cost & abuse guardrails:** per-key **spend caps** + RPM/RPD/TPM set in the Mesh dashboard; audit logs capture tokens/latency/cost per call. This is the backend budget backstop behind the frontend quota UI.

**Frontend implication:** the frontend only ever sees the **stored `documents.content` Markdown** produced from these calls, plus per-step token/latency/cost numbers surfaced (optionally) in tooltips on the stepper. It never holds a Mesh key or streams from Mesh directly.

---

## B4. Inngest — Durable Orchestration **[BE]** (frontend observes via polling)

**What it does:** Runs the multi-step agent pipelines durably off the request path. Each agent is a memoized `step.run(...)`; steps retry on transient failure and never re-execute (or re-pay) once complete. Each step boundary writes status to Postgres — which is what the frontend reads.

**Endpoints / events:**

| Direction | Endpoint / event | Data sent | Expected response |
|---|---|---|---|
| Our server → Inngest | `inngest.send("project/prd.requested", { projectId, userId })` | project + user ids, optional `notes` | Event accepted; `runPrdPipeline` triggered |
| Our server → Inngest | `inngest.send("project/addons.requested", { projectId, requestedDocs, references })` | selected doc subset + reference pointers | `runAddonPipeline` triggered |
| Inngest → our app | `POST /api/inngest` (serve endpoint) | Signed step-execution payloads (`INNGEST_SIGNING_KEY`) | Function code runs steps, writes `pipeline_steps` status + `documents` rows, returns step results |

**Frontend contract:** the browser **does not** talk to Inngest. It emits work indirectly (Server Actions call `inngest.send`) and observes progress purely through `GET /api/projects/:id/status` (§B7), which reads `pipeline_steps` from Postgres. This is the "DB-as-status-board" pattern — it survives reconnects and the closed-tab / "review at end" case for free.

---

## B5. Cloudflare R2 — Object Storage **[FE→BE presign, then FE direct PUT]**

**What it does:** Stores UI/UX **reference images** and generated **`.zip`** files. Chosen for zero egress fees (users download zips). S3-compatible.

**Flow the frontend participates in:**

| Step | Direction | Endpoint | Data sent | Expected response |
|---|---|---|---|---|
| 1. Request upload URL | Browser → our API | `POST /api/uploads/presign` | `{ filename, contentType, sizeBytes }` | `{ url, storageKey, expiresIn }` — a short-lived presigned **PUT** URL. Server validates content-type ∈ image types and `sizeBytes ≤ MAX_UPLOAD_MB` before issuing. |
| 2. Upload the file | Browser → R2 directly | `PUT <presigned url>` | Raw image bytes, `Content-Type` header matching | `200 OK` (empty body). **Bytes never proxy through our serverless function.** |
| 3. Record the reference | Browser → our API (Server Action) | `{ projectId, kind: "image", storageKey, note? }` | Inserts a `references` row | `{ referenceId }` |
| 4. Download zip | Browser → our API | `GET /api/projects/:id/download` | — | Streamed `application/zip` (`archiver`), built from all `is_user_facing` documents or served from an R2-cached object |

**Constraints surfaced in UI:** `MAX_REFERENCE_UPLOADS` (default 5), `MAX_UPLOAD_MB` (default 10). The dropzone (A6.6) enforces these client-side and the presign endpoint re-checks server-side. Text/link references bypass R2 entirely (stored as `references.url`, and text docs may route to Mesh RAG instead).

---

## B6. Stripe — Payments **[FE redirect + BE webhook]**

**What it does:** One-time, pay-per-project charge (PRD §10 — not a subscription). Uses Stripe Checkout in one-time mode.

**Flow:**

| Step | Direction | Endpoint | Data sent | Expected response |
|---|---|---|---|---|
| 1. Create checkout session | Browser → our API (Server Action `createCheckoutSession`) | `{ }` (server derives user + price `STRIPE_PRICE_PER_PROJECT`) | `{ checkoutUrl, sessionId }`. Server first creates the `project` row in `payment_pending` status so the webhook has something to attach to. |
| 2. Server → Stripe | `POST https://api.stripe.com/v1/checkout/sessions` | `mode=payment`, `line_items[price]=price_...`, `success_url`, `cancel_url`, `client_reference_id=projectId` | Session object with a hosted `url` |
| 3. Redirect | Browser → Stripe Checkout | `window.location = checkoutUrl` (or `@stripe/stripe-js` `redirectToCheckout`) | Hosted Stripe payment page |
| 4. Payment result | Stripe → our app (webhook) | `POST /api/webhooks/stripe` — `checkout.session.completed` | We verify signature (`STRIPE_WEBHOOK_SECRET`), write a `payments` row (dedup on unique `stripe_checkout_session_id`), flip the `project` from `payment_pending` → `draft`, return `200` |
| 5. Return to app | Browser → `success_url` | — | Success toast; intake unlocks. Idempotent: duplicate webhook deliveries are no-ops. |

**Frontend SDK:** `@stripe/stripe-js` loaded with `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (only needed if using `redirectToCheckout`; a plain `window.location` redirect to `session.url` also works and is simpler). The frontend never sees card data — it stays on Stripe's hosted page (PCI scope stays minimal).

**UI states:** paywall modal (A6.9) → redirect → on `cancel_url` return, a Warning toast "PAYMENT CANCELLED"; on success, "PAYMENT SUCCESSFUL". Price is loaded from the server (never hardcoded in the client; exact amount is a launch open question per PRD §10).

---

## B7. Internal API Contract (the app's own Route Handlers & Server Actions) **[FE→BE]**

The frontend's primary integration surface. These are **our** endpoints; they orchestrate all the services above.

### Route Handlers (`src/app/api/*`)

| Endpoint | Method | Data sent | Expected response | Used by |
|---|---|---|---|---|
| `/api/projects/[projectId]/status` | GET | — (auth via session) | `{ run: { kind, status }, steps: [{ agent, order_index, status, model?, tokens?, latency_ms? }] }` — read from `pipeline_steps` | Pipeline Stepper (A5.5), polled ~2s; optional SSE variant |
| `/api/projects/[projectId]/download` | GET | — | Streamed `application/zip` (`PRD.md` + selected docs) | "DOWNLOAD .ZIP" button |
| `/api/uploads/presign` | POST | `{ filename, contentType, sizeBytes }` | `{ url, storageKey, expiresIn }` | Reference image dropzone |
| `/api/inngest` | POST | Inngest-signed payloads | step results | Inngest only (not the browser) |
| `/api/webhooks/stripe` | POST | Stripe event | `200` | Stripe only |
| `/api/webhooks/clerk` | POST | Svix event | `200` | Clerk only |

### Server Actions (`src/actions/*`) — invoked from client components as mutations

| Action | Input | Effect | Returns |
|---|---|---|---|
| `createProject` | `{ ideaText, ideaMeta? }` | Server-side **quota check** (`monthly_usage` vs `FREE_PROJECTS_PER_MONTH`); if within limit → create `project` + `pipeline_run(kind='prd')` + seed `pipeline_steps`, emit `project/prd.requested`. If over → return `paymentRequired`. | `{ projectId }` or `{ paymentRequired: true }` |
| `editDocument` | `{ projectId, docType, content }` | Update `documents.content`, set `last_edited_by_user=true` | `{ ok }` |
| `regenerate` | `{ projectId, docType?, notes? }` | Emit `project/prd.requested` (or addon re-run); overwrites in place (no version history, PRD §9) | `{ ok }` |
| `requestAddons` | `{ projectId, docs: string[], reviewMode, references? }` | Emit `project/addons.requested` | `{ ok }` |
| `createCheckoutSession` | `{ }` | Create `payment_pending` project + Stripe session | `{ checkoutUrl }` |

**Auth on all of the above:** every action/handler resolves the Clerk session server-side and filters by the authenticated `user_id`. Quota is **never** trusted from the client.

---

## B8. Resend — Transactional Email **[BE only]**

**What it does:** Sends receipts and "your docs are ready" notifications (relevant to the unattended "generate all, review at end" flow). No frontend contact.

| Direction | Endpoint | Data sent | Expected response |
|---|---|---|---|
| Our server → Resend | `POST https://api.resend.com/emails` | `{ from: EMAIL_FROM, to, subject, react/html }` (React Email templates) | `{ id }` on success |

**Frontend implication:** none directly. If an in-app "email me when ready" checkbox is added, it sets a flag the backend reads — the send itself is server-side.

---

## B9. Sentry — Error Monitoring **[FE + BE]**

**What it does:** Captures frontend and backend (including Inngest function) errors + performance.

| Direction | Endpoint | Data sent | Expected response |
|---|---|---|---|
| Browser → Sentry ingest | Sentry SDK auto-`POST` to the DSN host | Error events, stack traces, breadcrumbs, performance spans | `200` (ingest ack) |
| Server → Sentry | same, server SDK | Backend/Inngest errors | `200` |

**Frontend setup:** initialize `@sentry/nextjs` with `SENTRY_DSN`. DSN is public/safe to expose. Scrub PII (idea text can be sensitive) before send. Uncaught render errors surface the RawBlock error card (A6.10) while reporting silently.

---

## B10. Langfuse — Prompt-Quality Tracing **[BE only, OPTIONAL]**

**What it does:** Step-level traces + eval scoring of agent outputs against the test-idea suite (PRD §11). Complements Mesh's cost/latency logs with *quality* signal. Skippable for a hackathon build.

| Direction | Endpoint | Data sent | Expected response |
|---|---|---|---|
| Our server → Langfuse | `https://cloud.langfuse.com` (SDK) | Per-step traces (prompt, model, output, scores) | trace ack |

**Frontend implication:** none.

---

## B11. Neon Postgres (via Drizzle) — System of Record **[BE only]**

**What it does:** Relational store for `users → projects → documents / pipeline_runs → pipeline_steps / references / payments / monthly_usage` (schema in `TECHNICAL-ARCHITECTURE.md §5`). The **single source of truth for pipeline status** the frontend reads through `/status`.

- **App connection:** pooled `DATABASE_URL`. **Migrations:** direct `DIRECT_DATABASE_URL`. (Mixing them causes "too many connections" errors.)
- **Frontend implication:** none directly — the browser never opens a DB connection. All reads reach the frontend through Server Components (`db/queries/*`) or the status/download Route Handlers; all writes go through Server Actions.

---

## B12. Integration Sequence — One Full Project (frontend's-eye view)

```
[FE] user signs in ................................ Clerk (session JWT)
[FE→BE] createProject(idea) ....................... Server Action
        └─ quota check ........................... Neon (monthly_usage)
        └─ within limit? emit event .............. Inngest (project/prd.requested)
        └─ over limit? ........................... → paywall modal
                                                     └─ createCheckoutSession → Stripe
                                                     └─ webhook → /api/webhooks/stripe → Neon
[BE] runPrdPipeline: research→draft→refine ........ Inngest steps → Mesh (chat + web search)
        └─ each step writes status ............... Neon (pipeline_steps)
[FE] poll every ~2s ............................... GET /api/projects/:id/status → Neon
[FE] render PRD Markdown, edit/regenerate ......... Server Actions → Neon (+ re-emit → Inngest)
[FE→BE] requestAddons(subset, refs) ............... Server Action
        └─ image refs: presign then PUT .......... /api/uploads/presign → Cloudflare R2
        └─ emit event ............................ Inngest (project/addons.requested)
[BE] runAddonPipeline: tech→security→uiux→tickets . Inngest → Mesh (+ RAG for UI/UX refs)
[FE] download package ............................. GET /api/projects/:id/download → R2/archiver
[BE] "docs ready" email (if unattended) ........... Resend
[FE+BE] any error ................................. Sentry     [BE] quality traces → Langfuse
```

---

*This document is derived from `PRD.md`, `TECHNICAL-ARCHITECTURE.md`, and `DESIGN.md`. The RawBlock theme is authoritative and unchanged; any new component (modals, stepper, toasts) was built only from RawBlock's existing primitives. The integration spec must be revised alongside `TECHNICAL-ARCHITECTURE.md`; the one contract to defend hardest is §B4/§B7 — the frontend observes pipeline progress **only** by polling our own DB-backed status endpoint, never by calling Inngest or Mesh directly.*
