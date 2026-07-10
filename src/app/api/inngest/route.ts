import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

/**
 * Inngest serve endpoint (T-022). The Inngest Dev Server (`npx inngest-cli
 * dev`) discovers the app's functions here. In production the signing key is
 * verified automatically from INNGEST_SIGNING_KEY.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
