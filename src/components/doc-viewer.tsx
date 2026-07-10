import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Rendered-Markdown reading surface (T-033, FRONTEND-SPEC A6.5). react-markdown
 * + remark-gfm (tables, task lists) in a 760px max-width RawBlock surface.
 * Styling comes from the scoped `.doc-prose` rules in globals.css.
 */
export function DocViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("doc-prose mx-auto w-full max-w-reading", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
