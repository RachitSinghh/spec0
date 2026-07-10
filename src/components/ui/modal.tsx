"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

/**
 * RawBlock Modal (A5.4). 60% black scrim, 5px black border container, inverted
 * black header bar with white uppercase title + right-flush [X], Work Sans
 * body, right-flush footer. Esc + [X] close (Radix focus trap). NO entrance
 * animation — instant appear (polish is against the system).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2",
            "border-heavy border-black bg-white",
            "max-md:w-full max-md:max-w-full",
          )}
        >
          <div className="flex items-center justify-between bg-black px-sp-3 py-sp-3">
            <Dialog.Title className="font-heading text-xl uppercase text-white">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="border-thick border-white px-2 leading-none text-white hover:bg-white hover:text-black"
            >
              X
            </Dialog.Close>
          </div>
          <div className="p-sp-5 font-sans text-body">{children}</div>
          {footer ? (
            <div className="flex flex-wrap justify-end gap-sp-3 px-sp-5 pb-sp-5">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
