import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Helper text under a field — tiny Work Sans, red in the error state (A5.2). */
export function HelperText({
  children,
  error,
  className,
}: {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-1 text-tiny",
        error ? "text-error" : "text-content-secondary",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Field composes a Label + control + optional helper/error message.
 * Pass the control as children (Input, Textarea, etc.).
 */
export function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
  className,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  helper?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {error ? (
        <HelperText error>{error}</HelperText>
      ) : helper ? (
        <HelperText>{helper}</HelperText>
      ) : null}
    </div>
  );
}
