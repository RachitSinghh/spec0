import { runPrdPipeline } from "@/inngest/functions/run-prd-pipeline";
import { runAddonPipeline } from "@/inngest/functions/run-addon-pipeline";

/**
 * Registry of all durable functions served at /api/inngest.
 * The cleanup cron (T-063) is added here when built.
 */
export const functions = [runPrdPipeline, runAddonPipeline];
