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

export function projectChip(status: ProjectStatus): {
  label: string;
  status: ChipStatus;
} {
  switch (status) {
    case "payment_pending":
      return { label: "PAYMENT PENDING", status: "warning" };
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
