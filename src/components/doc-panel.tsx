"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { DocType } from "@/types";
import { DocViewer } from "@/components/doc-viewer";
import { DocEditor } from "@/components/doc-editor";
import { RegenerateModal } from "@/components/regenerate-modal";
import { Button } from "@/components/ui/button";

/**
 * Completed-document surface (T-033/T-034): rendered doc + actions, with a
 * view/edit toggle. EDIT swaps in the split editor; the regenerate modal is
 * wired in T-035.
 */
export function DocPanel({
  projectId,
  docType,
  content,
  lastEditedByUser = false,
  continueHref,
}: {
  projectId: string;
  docType: DocType;
  content: string;
  lastEditedByUser?: boolean;
  continueHref?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(content);

  // Keep in sync if the server component re-renders with fresh content.
  React.useEffect(() => setCurrent(content), [content]);

  if (editing) {
    return (
      <DocEditor
        projectId={projectId}
        docType={docType}
        initialContent={current}
        onSaved={(next) => {
          setCurrent(next);
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-sp-5">
      <DocViewer content={current} />
      <div className="flex flex-wrap gap-sp-3 border-t-thick border-black pt-sp-4">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          EDIT
        </Button>
        <Button variant="secondary" onClick={() => setRegenOpen(true)}>
          REGENERATE
        </Button>
        {continueHref ? (
          <Button asChild>
            <Link href={continueHref} className="no-underline">
              CONTINUE → ADD-ONS
            </Link>
          </Button>
        ) : null}
      </div>
      <RegenerateModal
        projectId={projectId}
        docType={docType}
        lastEditedByUser={lastEditedByUser}
        open={regenOpen}
        onOpenChange={setRegenOpen}
      />
    </div>
  );
}
