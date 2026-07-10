import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status chip (A5.6): square, 2px colored border, 11px semibold uppercase,
 * 1px tracking. Colored text + border on white fill. Never blue (links only).
 */
const statusChipVariants = cva(
  "inline-flex items-center border-2 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[1px] leading-none",
  {
    variants: {
      status: {
        default: "border-black text-black",
        success: "border-success text-success",
        warning: "border-warning text-warning",
        error: "border-error text-error",
      },
    },
    defaultVariants: {
      status: "default",
    },
  },
);

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {}

export function StatusChip({
  className,
  status,
  ...props
}: StatusChipProps) {
  return (
    <span
      className={cn(statusChipVariants({ status }), className)}
      {...props}
    />
  );
}

/**
 * Filter chip (A5.6): white/black, 2px border, uppercase 10px, 1px tracking.
 * Active → black fill, white text (full inversion).
 */
export interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function FilterChip({
  className,
  active = false,
  type = "button",
  ...props
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center border-2 border-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] leading-none transition-colors",
        active ? "bg-black text-white" : "bg-white text-black hover:bg-black hover:text-white",
        className,
      )}
      {...props}
    />
  );
}

export { statusChipVariants };
