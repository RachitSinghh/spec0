"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { AddonDocType, ReferenceInput } from "@/types";
import { requestAddons } from "@/actions/addons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioItem } from "@/components/ui/radio";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ReferenceUploader } from "@/components/reference-uploader";

/** Fixed generation order (Technical → Security → UI/UX → Tickets). */
const DOCS: { key: AddonDocType; label: string; tooltip?: string }[] = [
  { key: "technical", label: "TECHNICAL" },
  {
    key: "security",
    label: "SECURITY",
    tooltip: "In v1 this is best-practice guidance, not a security audit.",
  },
  { key: "ui_ux", label: "UI-UX" },
  { key: "tickets", label: "TICKETS" },
];

type ReviewMode = "each" | "all";

/**
 * Add-on selection screen (T-040, FRONTEND-SPEC A6.6). Four checkboxes in the
 * fixed generation order, a SECURITY caveat tooltip, review-mode radios, and
 * the UI-UX reference uploader (T-042) revealed when UI-UX is checked.
 */
export function AddonSelector({
  projectId,
  maxReferences = 5,
  maxUploadMb = 10,
}: {
  projectId: string;
  maxReferences?: number;
  maxUploadMb?: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<AddonDocType>>(new Set());
  const [reviewMode, setReviewMode] = React.useState<ReviewMode>("each");
  const [references, setReferences] = React.useState<ReferenceInput[]>([]);
  const [busy, setBusy] = React.useState(false);

  const toggle = (key: AddonDocType) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const canSubmit = selected.size > 0 && !busy;

  async function onGenerate() {
    if (!canSubmit) return;
    setBusy(true);
    const docs = DOCS.filter((d) => selected.has(d.key)).map((d) => d.key);
    try {
      await requestAddons({
        projectId,
        docs,
        reviewMode,
        references: selected.has("ui_ux") ? references : undefined,
      });
      // review-each → land on the first doc as it generates; generate-all →
      // watch the run on the project page and end on the package screen (T-045).
      if (reviewMode === "each") {
        router.push(`/projects/${projectId}/docs/${docs[0]}`);
      } else {
        router.push(`/projects/${projectId}?package=1`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex max-w-reading flex-col gap-sp-5">
        <fieldset className="flex flex-col gap-sp-3">
          <legend className="mb-sp-2 font-heading text-h4 uppercase">Documents</legend>
          {DOCS.map((d) => (
            <div key={d.key} className="flex flex-col gap-sp-3">
              <label className="flex items-center gap-sp-3">
                <Checkbox
                  checked={selected.has(d.key)}
                  onCheckedChange={() => toggle(d.key)}
                />
                <span className="font-mono uppercase">{d.label}</span>
                {d.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Why is security generic in v1?"
                        className="border-2 border-black px-1.5 font-mono text-tiny leading-none"
                      >
                        ?
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{d.tooltip}</TooltipContent>
                  </Tooltip>
                ) : null}
              </label>
              {d.key === "ui_ux" && selected.has("ui_ux") ? (
                <div className="ml-8 border-l-thick border-black pl-sp-3">
                  <ReferenceUploader
                    projectId={projectId}
                    value={references}
                    onChange={setReferences}
                    maxReferences={maxReferences}
                    maxUploadMb={maxUploadMb}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-sp-2">
          <legend className="mb-sp-2 font-heading text-h4 uppercase">Review mode</legend>
          <RadioGroup
            value={reviewMode}
            onValueChange={(v) => setReviewMode(v as ReviewMode)}
            className="flex flex-col gap-sp-2"
          >
            <label className="flex items-center gap-sp-3">
              <RadioItem value="each" />
              <span>REVIEW EACH DOC AS IT COMPLETES</span>
            </label>
            <label className="flex items-center gap-sp-3">
              <RadioItem value="all" />
              <span>GENERATE ALL, REVIEW AT END</span>
            </label>
          </RadioGroup>
        </fieldset>

        <div>
          <Button size="large" onClick={onGenerate} disabled={!canSubmit}>
            {busy ? "GENERATING…" : "GENERATE DOCS"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
