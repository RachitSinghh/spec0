/**
 * Maps a project's coarse status to the dashboard status chip
 * (FRONTEND-SPEC A6.3) and whether a download link should show.
 * Client-safe (no server-only imports).
 */
export type ProjectStatus =
  | "payment_pending"
  | "draft"
  | "addons_pending"
  | "complete"
  | "failed";

export type ChipStatus = "default" | "success" | "warning" | "error";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export function projectChip(
  status: ProjectStatus,
  paymentStatus?: PaymentStatus | null,
): {
  label: string;
  status: ChipStatus;
} {
  // A payment_pending project reflects its payment outcome so a failed or
  // cancelled attempt doesn't read as "still pending".
  if (status === "payment_pending") {
    if (paymentStatus === "failed")
      return { label: "PAYMENT FAILED", status: "error" };
    if (paymentStatus === "cancelled")
      return { label: "PAYMENT CANCELLED", status: "warning" };
    return { label: "PAYMENT PENDING", status: "warning" };
  }
  switch (status) {
    case "failed":
      return { label: "FAILED", status: "error" };
    case "complete":
      return { label: "FULL PACKAGE", status: "success" };
    case "addons_pending":
    case "draft":
    default:
      return { label: "PRD ONLY", status: "default" };
  }
}

/** A finished doc exists to download once the PRD run has produced output. */
export function canDownload(status: ProjectStatus): boolean {
  return status === "draft" || status === "addons_pending" || status === "complete";
}
