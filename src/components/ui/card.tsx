import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * RawBlock Card (A5.3). Default = 3px border; Elevated = 5px border (heavier
 * border signals more importance). Never a shadow, never a radius.
 */
const cardVariants = cva("bg-white border-black p-sp-4", {
  variants: {
    variant: {
      default: "border-thick",
      elevated: "border-heavy",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { Card, cardVariants };
