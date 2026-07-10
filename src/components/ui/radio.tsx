"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

/**
 * RawBlock Radio (A5.8): 20x20, 3px black border, circle — the ONE 0px-radius
 * exception in the whole system. Selected → 10px black inner dot. Focus → 5px
 * border. Disabled → grey border.
 */
const RadioGroup = RadioGroupPrimitive.Root;

const RadioItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      // rounded-full is the single permitted radius in RawBlock.
      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-thick border-black bg-white",
      "outline-none focus-visible:border-heavy",
      "disabled:cursor-not-allowed disabled:border-border-disabled disabled:bg-surface-disabled",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="block h-2.5 w-2.5 rounded-full bg-black" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioItem.displayName = "RadioItem";

export { RadioGroup, RadioItem };
