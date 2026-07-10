import type { DocType } from "@/types";

/**
 * Canonical per-document metadata (T-044/T-045): the display title and the
 * export filename. `research_brief` is internal (no export filename).
 */
export const DOC_META: Record<
  DocType,
  { title: string; filename: string | null }
> = {
  research_brief: { title: "Research Brief", filename: null },
  prd: { title: "PRD", filename: "PRD.md" },
  technical: {
    title: "Technical Documentation",
    filename: "technical-documentation.md",
  },
  security: {
    title: "Security Documentation",
    filename: "security-documentation.md",
  },
  ui_ux: { title: "UI/UX Documentation", filename: "ui-ux-documentation.md" },
  tickets: { title: "Tickets", filename: "tickets.md" },
};

export function docTitle(type: DocType): string {
  return DOC_META[type]?.title ?? type;
}

/** Export filename for a doc, or null if it isn't user-facing. */
export function exportFilename(type: DocType): string | null {
  return DOC_META[type]?.filename ?? null;
}
