import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * spec0 database schema — the single source of truth (TECHNICAL-ARCHITECTURE §5).
 * Drizzle generates both the SQL migrations and the TypeScript types from this file.
 *
 * Conventions: UUID primary keys; every table carries created_at/updated_at
 * (updated_at auto-touched on write); access control is enforced in the query
 * layer by always filtering on user_id.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["free", "paid"]);

export const projectStatusEnum = pgEnum("project_status", [
  "payment_pending",
  "draft",
  "addons_pending",
  "complete",
  "failed",
]);

export const billingStatusEnum = pgEnum("billing_status", ["free", "paid"]);

export const documentTypeEnum = pgEnum("document_type", [
  "research_brief",
  "prd",
  "technical",
  "security",
  "ui_ux",
  "tickets",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "generating",
  "ready",
  "failed",
]);

export const pipelineKindEnum = pgEnum("pipeline_kind", ["prd", "addons"]);

export const pipelineRunStatusEnum = pgEnum("pipeline_run_status", [
  "queued",
  "running",
  "complete",
  "failed",
]);

export const agentEnum = pgEnum("agent", [
  "research",
  "draft",
  "refine",
  "technical",
  "security",
  "ui_ux",
  "tickets",
]);

export const pipelineStepStatusEnum = pgEnum("pipeline_step_status", [
  "pending",
  "running",
  "complete",
  "failed",
  "skipped",
]);

export const referenceKindEnum = pgEnum("reference_kind", ["link", "image"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

// Shared timestamp columns.
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── 5.1 users ────────────────────────────────────────────────────────────
// One row per account. A mirror of the Clerk user + app-specific fields.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    plan: planEnum("plan").notNull().default("free"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_clerk_id_unique").on(t.clerkId)],
);

// ─── 5.2 projects ───────────────────────────────────────────────────────────
// One row per idea. The unit of monetization; owns documents/runs/references.
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    ideaText: text("idea_text").notNull(),
    ideaMeta: jsonb("idea_meta").$type<Record<string, string>>(),
    status: projectStatusEnum("status").notNull().default("draft"),
    billingStatus: billingStatusEnum("billing_status").notNull().default("free"),
    ...timestamps,
  },
  (t) => [index("projects_user_id_idx").on(t.userId)],
);

// ─── 5.3 documents ────────────────────────────────────────────────────────
// One row per generated artifact (incl. internal research_brief). No version
// history in v1 — regeneration overwrites content in place. At most one row
// per (project_id, type).
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: documentTypeEnum("type").notNull(),
    content: text("content").notNull().default(""),
    isUserFacing: boolean("is_user_facing").notNull().default(true),
    status: documentStatusEnum("status").notNull().default("pending"),
    lastEditedByUser: boolean("last_edited_by_user").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("documents_project_id_idx").on(t.projectId),
    uniqueIndex("documents_project_type_unique").on(t.projectId, t.type),
  ],
);

// ─── 5.4 pipeline_runs ──────────────────────────────────────────────────────
// One row per pipeline execution (a PRD run, an add-ons run, or a regenerate).
export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: pipelineKindEnum("kind").notNull(),
    requestedDocs: jsonb("requested_docs").$type<string[]>(),
    notes: text("notes"),
    status: pipelineRunStatusEnum("status").notNull().default("queued"),
    inngestRunId: text("inngest_run_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("pipeline_runs_project_id_idx").on(t.projectId)],
);

// ─── 5.5 pipeline_steps ─────────────────────────────────────────────────────
// One row per agent step inside a run — the granular status board + per-step
// cost/latency record.
export const pipelineSteps = pgTable(
  "pipeline_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    agent: agentEnum("agent").notNull(),
    orderIndex: integer("order_index").notNull(),
    status: pipelineStepStatusEnum("status").notNull().default("pending"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("pipeline_steps_run_id_idx").on(t.runId)],
);

// ─── 5.6 references ─────────────────────────────────────────────────────────
// Uploaded inspiration for the UI/UX agent only — links and/or images.
export const references = pgTable(
  "references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: referenceKindEnum("kind").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("references_project_id_idx").on(t.projectId)],
);

// ─── 5.7 payments ─────────────────────────────────────────────────────────
// One row per one-time charge. Dodo: checkoutRef = projectId, paymentRef =
// Dodo payment id. The unique checkout ref dedupes webhook retries.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    // NOTE: underlying DB columns keep their original (stripe-era) names to
    // avoid a rename migration; kept across the Razorpay and Dodo gateways.
    checkoutRef: text("stripe_checkout_session_id").notNull(),
    paymentRef: text("stripe_payment_intent_id"),
    amountCents: integer("amount_cents").notNull(), // minor units (paise)
    currency: text("currency").notNull().default("usd"), // always set explicitly on insert
    status: paymentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payments_user_id_idx").on(t.userId),
    uniqueIndex("payments_checkout_session_unique").on(t.checkoutRef),
  ],
);

// ─── 5.8 monthly_usage ──────────────────────────────────────────────────────
// O(1), race-safe quota counter. One row per user per calendar month.
export const monthlyUsage = pgTable(
  "monthly_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // calendar month key, e.g. "2026-07"
    projectsCreated: integer("projects_created").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("monthly_usage_user_period_unique").on(t.userId, t.period)],
);

// ─── Inferred types ─────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;
export type PipelineStep = typeof pipelineSteps.$inferSelect;
export type NewPipelineStep = typeof pipelineSteps.$inferInsert;
export type Reference = typeof references.$inferSelect;
export type NewReference = typeof references.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type MonthlyUsage = typeof monthlyUsage.$inferSelect;
export type NewMonthlyUsage = typeof monthlyUsage.$inferInsert;
