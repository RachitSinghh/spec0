import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config (TECHNICAL-ARCHITECTURE §5–6).
 *
 * Migrations run over the DIRECT (unpooled) connection string — the pooled
 * DATABASE_URL is for the running app only (§6.1.1). drizzle-kit runs in plain
 * Node (no server-only env module here), so we load .env.local directly.
 */
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
