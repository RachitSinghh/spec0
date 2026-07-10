import "server-only";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";

import { env } from "@/lib/env";
import * as schema from "@/db/schema";

/**
 * Drizzle client for the running app.
 *
 * Production uses the POOLED `DATABASE_URL` via the Neon serverless driver —
 * serverless functions open many short-lived connections, so pooling avoids
 * "too many connections". Migrations use the DIRECT url (drizzle.config.ts).
 *
 * For local development against a plain Postgres (localhost) the Neon
 * serverless driver can't connect (it speaks WebSocket to Neon), so we fall
 * back to node-postgres. The connection string is still `DATABASE_URL`.
 */
const url = env.DATABASE_URL;
const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);

export const db = isLocal
  ? drizzlePg(new PgPool({ connectionString: url }), { schema })
  : drizzleNeon(new NeonPool({ connectionString: url }), { schema });

export { schema };
