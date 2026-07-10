import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/** RawBlock Label — Archivo Black 14px uppercase (A5.2). */
const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "mb-1 block font-heading text-[14px] uppercase leading-none tracking-wide text-content-primary",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
