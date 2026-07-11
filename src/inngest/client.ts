import { Inngest, staticSchema } from "inngest";

import type { AddonDocType } from "@/types";
import type { ReferenceInput } from "@/agents/types";

/**
 * Inngest client + typed event contracts (T-022, FRONTEND-SPEC B4).
 *
 * Local dev: `npx inngest-cli dev` auto-discovers functions at /api/inngest —
 * no keys needed. INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY are production-only.
 */

type PrdRequested = {
  data: {
    projectId: string;
    userId: string;
    notes?: string;
    /** Docs pre-selected at intake — PRD pipeline auto-chains into add-ons. */
    autoDocs?: AddonDocType[];
  };
};

type AddonsRequested = {
  data: {
    projectId: string;
    userId: string;
    requestedDocs: AddonDocType[];
    references?: ReferenceInput[];
    notes?: string;
  };
};

export const inngest = new Inngest({
  id: "spec0",
  schemas: {
    "project/prd.requested": staticSchema<PrdRequested>(),
    "project/addons.requested": staticSchema<AddonsRequested>(),
  },
});

export type Events = {
  "project/prd.requested": PrdRequested;
  "project/addons.requested": AddonsRequested;
};
