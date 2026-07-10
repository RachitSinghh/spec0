import { StatusChip } from "@/components/ui/chip";

/**
 * Quota counter chip (FRONTEND-SPEC A6.3): "PROJECTS THIS MONTH: X/N FREE".
 * Flips to the Warning variant at/over the limit.
 */
export function QuotaChip({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const atLimit = used >= limit;
  return (
    <StatusChip status={atLimit ? "warning" : "default"}>
      {`PROJECTS THIS MONTH: ${used}/${limit} FREE`}
    </StatusChip>
  );
}
