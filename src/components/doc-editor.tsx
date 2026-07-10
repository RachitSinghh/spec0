"use client";

import * as React from "react";

import type { DocType } from "@/types";
import { editDocument } from "@/actions/projects";
import { DocViewer } from "@/components/doc-viewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Split editor (T-034, FRONTEND-SPEC A6.5): mono textarea on the left, live
 * react-markdown preview on the right. Save calls the editDocument Server
 * Action (which sets last_edited_by_user). Generic over docType — serves the
 * PRD and every add-on doc.
 */
export function DocEditor({
  projectId,
  docType,
  initialContent,
  onSaved,
  onCancel,
}: {
  projectId: string;
  docType: DocType;
  initialContent: string;
  onSaved?: (content: string) => void;
  onCancel?: () => void;
}) {
  const [content, setContent] = React.useState(initialContent);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await editDocument({ projectId, docType, content });
      setSaved(true);
      onSaved?.(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-sp-4">
      <div className="grid gap-sp-4 lg:grid-cols-2">
        <Textarea
          aria-label="Document source"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSaved(false);
          }}
          rows={24}
          className="min-h-[60vh]"
          disabled={saving}
        />
        <div className="border-thick border-black p-sp-3 overflow-y-auto max-h-[70vh]">
          <DocViewer content={content} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-sp-3 border-t-thick border-black pt-sp-4">
        <Button onClick={save} disabled={saving}>
          {saving ? "SAVING…" : "SAVE"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            CANCEL
          </Button>
        ) : null}
        {saved ? (
          <span className="font-mono text-small text-success">DOCUMENT SAVED</span>
        ) : null}
        {error ? (
          <span className="font-mono text-small text-error">{error}</span>
        ) : null}
      </div>
    </div>
  );
}
