import { env } from "@/lib/env";
import { IntakeForm } from "@/components/intake-form";

/** Idea intake screen (T-031, FRONTEND-SPEC A6.4). */
export default function NewProjectPage() {
  // Payments ship dark: no Dodo key in the environment → the paywall shows a
  // "coming soon" note instead of checkout.
  const paymentsEnabled = Boolean(env.DODO_PAYMENTS_API_KEY);
  return (
    <div className="flex flex-col gap-sp-5">
      <h2 className="text-h2 uppercase">DESCRIBE YOUR IDEA</h2>
      <IntakeForm paymentsEnabled={paymentsEnabled} />
    </div>
  );
}
