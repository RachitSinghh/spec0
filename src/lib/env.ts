import "server-only";
import { z } from "zod";

/**
 * Server-side environment (TECHNICAL-ARCHITECTURE §6).
 *
 * This module is marked `server-only`: importing it from a Client Component
 * is a build error, so a server secret can never be bundled into the browser.
 * Client-safe (NEXT_PUBLIC_*) values live in `env.client.ts`.
 *
 * Validation runs once at first import and fails fast with a readable error
 * naming any missing/invalid required var. Set SKIP_ENV_VALIDATION=true to
 * bypass (e.g. building in CI without real secrets).
 */

// A non-empty string, i.e. a required secret.
const required = z.string().min(1);
// Optional integration secret — validated only where the feature is used.
const optional = z.string().min(1).optional();

const boolFromString = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const serverSchema = z.object({
  // ─── App ───
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),

  // ─── Auth (Clerk) ───
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: required,
  CLERK_SECRET_KEY: required,
  CLERK_WEBHOOK_SECRET: optional, // needed by the Clerk webhook (T-012)
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),

  // ─── Database (Neon) ───
  DATABASE_URL: required, // pooled — used by the running app
  DIRECT_DATABASE_URL: required, // unpooled — used by Drizzle migrations

  // ─── LLM gateway (Mesh) ───
  MESH_API_KEY: required,
  MESH_BASE_URL: z.url().default("https://api.meshapi.ai/v1"),
  MODEL_RESEARCH: z.string().default("anthropic/claude-sonnet-5"),
  MODEL_DRAFTING: z.string().default("anthropic/claude-sonnet-5"),
  MODEL_REFINE: z.string().default("anthropic/claude-opus-4-8"),
  MODEL_ADDONS: z.string().default("anthropic/claude-sonnet-5"),
  MODEL_LIGHT: z.string().default("google/gemini-flash"),
  MESH_ENABLE_WEB_SEARCH: boolFromString,

  // ─── Orchestration (Inngest) — prod-only, optional locally ───
  INNGEST_EVENT_KEY: optional,
  INNGEST_SIGNING_KEY: optional,

  // ─── Object storage (AWS S3) ───
  // AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are read straight
  // from process.env by the AWS SDK — they don't need to be listed here.
  S3_BUCKET: optional,
  S3_PUBLIC_BASE_URL: optional,

  // ─── Payments (Stripe) ───
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optional,
  STRIPE_PRICE_PER_PROJECT: optional,

  // ─── Observability ───
  SENTRY_DSN: optional,
  LANGFUSE_PUBLIC_KEY: optional,
  LANGFUSE_SECRET_KEY: optional,
  LANGFUSE_BASEURL: z.string().optional(),

  // ─── Email (Resend) ───
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,

  // ─── App limits — never hardcoded, always from env (with defaults) ───
  FREE_PROJECTS_PER_MONTH: z.coerce.number().int().positive().default(1),
  MAX_REFERENCE_UPLOADS: z.coerce.number().int().positive().default(5),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    // Trust the raw environment; used for builds without real secrets.
    return process.env as unknown as ServerEnv;
  }

  // Treat empty-string env vars (common in .env templates) as unset, so an
  // empty optional key is `undefined` (valid) and an empty required key gets a
  // clear "Required" error rather than a confusing length error.
  const cleaned = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
  );

  const parsed = serverSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\n` +
        `See .env.example for the full list. Set SKIP_ENV_VALIDATION=true to bypass.`,
    );
  }
  return parsed.data;
}

export const env: ServerEnv = loadEnv();

/**
 * App limits, resolved from env (TECHNICAL-ARCHITECTURE §6). Never hardcode
 * these anywhere else — read them from here.
 */
export const limits = {
  freeProjectsPerMonth: env.FREE_PROJECTS_PER_MONTH,
  maxReferenceUploads: env.MAX_REFERENCE_UPLOADS,
  maxUploadMb: env.MAX_UPLOAD_MB,
  maxUploadBytes: env.MAX_UPLOAD_MB * 1024 * 1024,
} as const;
