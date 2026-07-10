import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * RawBlock List (A5.7): transparent, Work Sans 16px, 3px black divider between
 * items, 12px vertical item padding, hover underline, active row inverts to
 * black/white full-width. Text only — no trailing icons.
 */
export function List({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn(
        "w-full divide-y-[3px] divide-black border-y-[3px] border-black text-body",
        className,
      )}
      {...props}
    />
  );
}

export interface ListItemProps
  extends React.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean;
  /** When true, rows underline the whole row on hover (default true). */
  interactive?: boolean;
}

export function ListItem({
  className,
  active = false,
  interactive = true,
  ...props
}: ListItemProps) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-4 py-3",
        interactive && "hover:underline",
        active && "bg-black px-3 text-white no-underline",
        className,
      )}
      {...props}
    />
  );
}
