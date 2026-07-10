/**
 * Shared app-level types.
 *
 * The canonical document-type union used across the pipeline, DB, and UI.
 * Kept in sync with the `documents.type` enum in src/db/schema.ts (T-004).
 */
export const DOC_TYPES = [
  "research_brief",
  "prd",
  "technical",
  "security",
  "ui_ux",
  "tickets",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

/** The subset of documents the user can select, generate, and export. */
export const ADDON_DOC_TYPES = [
  "technical",
  "security",
  "ui_ux",
  "tickets",
] as const;

export type AddonDocType = (typeof ADDON_DOC_TYPES)[number];

/** A UI/UX reference (link or uploaded image). Client-safe. */
export interface ReferenceInput {
  kind: "link" | "image";
  url: string;
  note?: string;
  /** Mesh RAG file id, once uploaded + embedded. */
  fileId?: string;
  /** R2 object key, for uploaded images. */
  storageKey?: string;
}
