"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getProjectStatus } from "@/actions/billing";

/**
 * Post-checkout return page. Dodo redirects here after payment; the webhook
 * flips the project live. Poll status until it leaves payment_pending, then
 * route to the project. Falls back to a message if the webhook is slow.
 */
function CheckoutSuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("project");
  const [slow, setSlow] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const { status } = await getProjectStatus(projectId);
      if (status && status !== "payment_pending" && status !== "unknown") {
        clearInterval(timer);
        router.replace(`/projects/${projectId}`);
      } else if (tries >= 20) {
        clearInterval(timer);
        setSlow(true);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [projectId, router]);

  return (
    <p className="font-mono text-small text-content-secondary">
      {slow
        ? "Payment received. Generation is taking a moment to start. Open your project from the dashboard shortly."
        : "Payment received. Starting your spec…"}
    </p>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="flex max-w-reading flex-col gap-sp-3 p-sp-4">
      <React.Suspense
        fallback={
          <p className="font-mono text-small text-content-secondary">
            Payment received. Starting your spec…
          </p>
        }
      >
        <CheckoutSuccessInner />
      </React.Suspense>
    </div>
  );
}
