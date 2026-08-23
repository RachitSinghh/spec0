"use server";

import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createUnlockCheckout } from "@/lib/dodo";
import { createProject as createProjectRow, getProjectForUser } from "@/db/queries/projects";
import { createPipelineRun, seedPipelineSteps } from "@/db/queries/pipeline";
import { insertPendingPayment } from "@/db/queries/payments";
import { ADDON_DOC_TYPES, type AddonDocType } from "@/types";

const PRD_STEPS = [
  { agent: "research" as const, orderIndex: 0 },
  { agent: "draft" as const, orderIndex: 1 },
  { agent: "refine" as const, orderIndex: 2 },
];

export interface CheckoutPayload {
  projectId: string;
  checkoutUrl: string;
}

/**
 * Over-quota purchase (E5): create the project in `payment_pending`, stash the
 * doc selection on a pre-created PRD run, create a Dodo checkout session, and
 * hand the client its URL. Nothing generates until payment lands.
 */
export async function beginPaidCheckout(input: {
  ideaText: string;
  ideaMeta?: { problem?: string; audience?: string; scope?: string };
  docs?: AddonDocType[];
}): Promise<CheckoutPayload> {
  const user = await requireUser();
  const ideaText = input.ideaText?.trim();
  if (!ideaText) throw new Error("Idea text is required.");
  if (!env.DODO_PAYMENTS_API_KEY) throw new Error("Payments are not configured.");

  const title = ideaText.split("\n")[0].slice(0, 80);
  const meta = Object.fromEntries(
    Object.entries(input.ideaMeta ?? {}).filter(([, v]) => v?.trim()),
  ) as Record<string, string>;

  const project = await createProjectRow({
    userId: user.id,
    ideaText,
    ideaMeta: Object.keys(meta).length ? meta : undefined,
    title,
    status: "payment_pending",
  });

  // Pre-create the PRD run: steps stay pending; requestedDocs carries the
  // intake doc selection across the payment boundary for the auto-chain.
  const docs = ADDON_DOC_TYPES.filter((d) => input.docs?.includes(d));
  const run = await createPipelineRun({
    projectId: project.id,
    kind: "prd",
    requestedDocs: docs.length ? docs : undefined,
  });
  await seedPipelineSteps(run.id, PRD_STEPS);

  const { checkoutUrl } = await createUnlockCheckout({
    projectId: project.id,
    userId: user.id,
  });

  await insertPendingPayment({
    userId: user.id,
    projectId: project.id,
    checkoutRef: project.id, // one payment row per project
    amountCents: env.PROJECT_PRICE_INR * 100,
    currency: "inr",
  });

  return { projectId: project.id, checkoutUrl };
}

/** Poll target for the checkout return page. */
export async function getProjectStatus(
  projectId: string,
): Promise<{ status: string }> {
  const user = await requireUser();
  const project = await getProjectForUser(projectId, user.id);
  return { status: project?.status ?? "unknown" };
}
