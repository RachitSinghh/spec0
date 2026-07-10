import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared RawBlock text-field surface (A5.2): sunken fill, mono 15px, 3px black
 * border, 5px on focus, red border on error, grey border/fill when disabled.
 * `outline-none` is paired with the 5px focus border which doubles as the
 * visible focus ring (A7).
 */
export const fieldClasses = (error?: boolean) =>
  cn(
    "w-full bg-surface-sunken font-mono text-mono text-content-primary",
    "border-thick border-black px-3 py-2.5",
    "placeholder:text-content-tertiary",
    "hover:bg-surface-hover-input",
    "focus:border-heavy focus:outline-none",
    "disabled:cursor-not-allowed disabled:border-border-disabled disabled:bg-surface-disabled",
    error && "border-error focus:border-error",
  );

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={error || undefined}
      className={cn(fieldClasses(error), className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
