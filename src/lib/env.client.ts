import { z } from "zod";

/**
 * Client-safe environment — ONLY `NEXT_PUBLIC_*` values, which Next.js inlines
 * into the browser bundle. Never add a server secret here.
 *
 * Each var is referenced by its literal name so Next's static replacement of
 * `process.env.NEXT_PUBLIC_*` works (dynamic access is not inlined).
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
});

const raw = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
};

function loadClientEnv() {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return raw as unknown as z.infer<typeof clientSchema>;
  }
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  const parsed = clientSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid public environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const clientEnv = loadClientEnv();
