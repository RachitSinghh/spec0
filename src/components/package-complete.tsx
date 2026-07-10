import Link from "next/link";

import type { DocType } from "@/types";
import { DOC_META } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { List, ListItem } from "@/components/ui/list";

/**
 * Package Complete screen (T-045, FRONTEND-SPEC A6.8). Manifest of the exported
 * files (mono) + a Large Primary "DOWNLOAD .ZIP". (The "ZIP READY" toast is
 * added with the toast system in T-061.)
 */
export function PackageComplete({
  projectId,
  docTypes,
}: {
  projectId: string;
  docTypes: DocType[];
}) {
  const files = docTypes
    .map((t) => ({ type: t, meta: DOC_META[t] }))
    .filter((f) => f.meta.filename);

  return (
    <div className="flex flex-col gap-sp-5">
      <h2 className="text-h2 uppercase">PACKAGE COMPLETE</h2>

      <List className="max-w-reading">
        {files.map((f) => (
          <ListItem key={f.type} interactive={false}>
            <Link
              href={`/projects/${projectId}/docs/${f.type}`}
              className="font-mono text-black no-underline hover:underline"
            >
              {f.meta.filename}
            </Link>
          </ListItem>
        ))}
      </List>

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
