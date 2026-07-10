import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * RawBlock Button (FRONTEND-SPEC A5.1 / DESIGN.md).
 *
 * Square, uppercase, 2px tracking. Hover = full color inversion. Active =
 * same fill + 5px border. Disabled = grey border + sunken fill (never
 * opacity). `enabled:` gates hover/active so disabled buttons never invert.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap",
    "font-sans font-semibold uppercase tracking-[2px]",
    "border-thick border-black transition-colors",
    "outline-none",
    // Disabled treatment — grey border + sunken fill + tertiary text.
    "disabled:cursor-not-allowed disabled:border-thick disabled:border-border-disabled",
    "disabled:bg-surface-sunken disabled:text-content-tertiary",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-black text-white",
          "enabled:hover:bg-white enabled:hover:text-black",
          "enabled:active:bg-black enabled:active:text-white enabled:active:border-heavy",
        ],
        secondary: [
          "bg-white text-black",
          "enabled:hover:bg-black enabled:hover:text-white",
          "enabled:active:bg-black enabled:active:text-white enabled:active:border-heavy",
        ],
        ghost: [
          "border-transparent bg-transparent text-black underline",
          "enabled:hover:text-blue",
          "disabled:bg-transparent disabled:border-transparent",
        ],
        destructive: [
          "bg-error text-white",
          "enabled:hover:bg-black enabled:hover:text-error",
        ],
      },
      size: {
        // [horizontal padding, font-size, height] per A5.1
        small: "h-8 px-4 text-[12px]",
        medium: "h-11 px-6 text-[14px]",
        large: "h-14 px-10 text-[18px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
