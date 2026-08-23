import Link from "next/link";

import type { DocType } from "@/types";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";

/**
 * Package Complete screen (T-045, FRONTEND-SPEC A6.8).
 *
 * A build manifest of the exported artifacts: numbered by pipeline/build order,
 * each row showing what the doc contains + its size + a hand-edited flag, with a
 * receipt-style summary (files · words · tokens) and the Large Primary
 * "DOWNLOAD .ZIP" as the one loud element.
 */

export interface PackageFile {
  type: DocType;
  title: string;
  filename: string;
  words: number;
  edited: boolean;
}

/** One-line "what's inside" per artifact — helps the reader know what they got. */
const DOC_BLURB: Partial<Record<DocType, string>> = {
  prd: "Problem, users, features, and scope.",
  technical: "Stack, schema, APIs, and build order.",
  security: "Auth, roles, data access, pre-launch checklist.",
  ui_ux: "Design system, key screens, integration spec.",
  tickets: "Epics and build-ready tickets.",
};

export function PackageComplete({
  projectId,
  files,
  totalTokens,
}: {
  projectId: string;
  files: PackageFile[];
  totalTokens: number;
}) {
  const totalWords = files.reduce((sum, f) => sum + f.words, 0);

  return (
    <div className="flex flex-col gap-sp-5">
      <header className="flex flex-col gap-sp-3">
        <div className="flex flex-wrap items-center gap-sp-4">
          <h2 className="text-h2 uppercase">Package complete</h2>
          <StatusChip status="success">Full package</StatusChip>
        </div>
        <p className="font-mono text-mono uppercase tracking-[1px] text-content-primary opacity-60">
          {files.length} files · {totalWords.toLocaleString()} words ·{" "}
          {totalTokens.toLocaleString()} tokens
        </p>
      </header>

      {/* Build manifest — numbered by pipeline order (that order is real: each */}
      {/* stage builds on the ones before it, ending in the ticket backlog). */}
      <ul className="divide-y-[3px] divide-black border-y-[3px] border-black">
        {files.map((f, i) => (
          <li key={f.type} className="flex items-start gap-sp-4 py-sp-3">
            <span className="w-8 shrink-0 pt-0.5 font-mono text-mono text-content-primary opacity-40">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-sp-3">
                <span className="font-sans font-semibold">{f.title}</span>
                {f.edited ? (
                  <StatusChip status="default">Edited</StatusChip>
                ) : null}
              </div>
              <p className="font-mono text-mono text-content-primary opacity-60">
                {f.filename}
              </p>
              {DOC_BLURB[f.type] ? (
                <p className="mt-1 text-small text-content-primary opacity-70">
                  {DOC_BLURB[f.type]}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className="font-mono text-mono text-content-primary opacity-60">
                {f.words.toLocaleString()} words
              </span>
              <Link
                href={`/projects/${projectId}/docs/${f.type}`}
                className="font-mono text-mono text-blue no-underline hover:underline"
              >
                view →
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <Button asChild size="large">
          <a
            href={`/api/projects/${projectId}/download`}
            className="no-underline"
            download
          >
            DOWNLOAD .ZIP
          </a>
        </Button>
      </div>
    </div>
  );
}
