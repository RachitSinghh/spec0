"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { DocType } from "@/types";
import { regenerate } from "@/actions/projects";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Regenerate flow (T-035). If the doc was hand-edited, the overwrite-warning
 * modal fires first; then the regenerate modal offers optional focus notes.
 * Regenerating resets the run so the stepper re-animates.
 */
export function RegenerateModal({
  projectId,
  docType,
  lastEditedByUser,
  open,
  onOpenChange,
}: {
  projectId: string;
  docType: DocType;
  lastEditedByUser: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"warn" | "notes">(
    lastEditedByUser ? "warn" : "notes",
  );
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Reset phase whenever the modal opens.
  React.useEffect(() => {
    if (open) setPhase(lastEditedByUser ? "warn" : "notes");
  }, [open, lastEditedByUser]);

  async function doRegenerate() {
    setBusy(true);
    try {
      await regenerate({ projectId, docType, notes: notes.trim() || undefined });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (phase === "warn") {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="OVERWRITE EDITED DOCUMENT?"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              CANCEL
            </Button>
            <Button onClick={() => setPhase("notes")}>CONTINUE</Button>
          </>
        }
      >
        <p>
          You hand-edited this document. Regenerating will replace your changes.
          Version history is not kept in v1.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="REGENERATE DOCUMENT"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            CANCEL
          </Button>
          <Button onClick={doRegenerate} disabled={busy}>
            {busy ? "REGENERATING…" : "REGENERATE"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-sp-3">
        <p>Optionally tell the pipeline what to focus on this time.</p>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. focus more on monetization"
          disabled={busy}
        />
      </div>
    </Modal>
  );
}
