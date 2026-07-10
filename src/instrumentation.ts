/**
 * Next.js instrumentation — runs once at server startup.
 * Importing the env module here validates all required environment variables
 * at boot, so a misconfigured deploy fails fast with a readable error rather
 * than surfacing a cryptic failure deep in a request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
  }
}
