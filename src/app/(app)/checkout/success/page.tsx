"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getCheckoutOutcome, retryUnlockCheckout } from "@/actions/billing";
import { Button } from "@/components/ui/button";

/**
 * Post-checkout return page. Dodo redirects here; the webhook settles the
 * payment. Poll the outcome: unlocked → open the project; failed/cancelled →
 * a custom retry screen (retry reuses the same project); otherwise keep waiting.
 */
type View = "processing" | "slow" | "failed";

function CheckoutReturn() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("project");
  const [view, setView] = React.useState<View>("processing");
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let active = true;
    let tries = 0;
    const timer = setInterval(async () => {
      if (!active) return;
      tries += 1;
      const { status, payment } = await getCheckoutOutcome(projectId);
      if (!active) return;
      if (status && status !== "payment_pending" && status !== "unknown") {
        clearInterval(timer);
        router.replace(`/projects/${projectId}`);
      } else if (payment === "failed" || payment === "cancelled") {
        clearInterval(timer);
        setView("failed");
      } else if (tries >= 20) {
        clearInterval(timer);
        setView("slow");
      }
    }, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId, router]);

  async function onRetry() {
    if (!projectId) return;
    setRetrying(true);
    try {
      const { checkoutUrl } = await retryUnlockCheckout(projectId);
      window.location.href = checkoutUrl;
    } catch {
      setRetrying(false);
    }
  }

  if (view === "failed") {
    return (
      <div className="flex flex-col gap-sp-3 border-thick border-error p-sp-4">
        <p className="font-mono text-small uppercase tracking-[1px] text-error">
          Payment didn&apos;t go through
        </p>
        <p className="text-body">
          Your payment didn&apos;t complete and no charge was made. Your idea and
          doc selection are saved, so you can try again.
        </p>
        <div className="flex flex-wrap gap-sp-3">
          <Button type="button" size="large" onClick={onRetry} disabled={retrying}>
            {retrying ? "OPENING CHECKOUT…" : "TRY AGAIN"}
          </Button>
          <Button asChild size="large" variant="secondary">
            <Link href="/dashboard" className="no-underline">
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <p className="font-mono text-small text-content-secondary">
      {view === "slow"
        ? "Still confirming your payment. If it went through, your project will appear on the dashboard shortly."
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
            Checking your payment…
          </p>
        }
      >
        <CheckoutReturn />
      </React.Suspense>
    </div>
  );
}
