import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge must be taught RawBlock's custom scales. Without this it
 * classifies `border-thick` / `text-small` as border-COLOR / text-COLOR and
 * silently drops them whenever a real color class appears in the same cn()
 * call (e.g. `border-thick border-black` → `border-black`).
 */
const BORDER_WIDTHS = ["thin", "thick", "heavy"]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": [{ border: BORDER_WIDTHS }],
      "border-w-t": [{ "border-t": BORDER_WIDTHS }],
      "border-w-b": [{ "border-b": BORDER_WIDTHS }],
      "border-w-l": [{ "border-l": BORDER_WIDTHS }],
      "border-w-r": [{ "border-r": BORDER_WIDTHS }],
      "border-w-x": [{ "border-x": BORDER_WIDTHS }],
      "border-w-y": [{ "border-y": BORDER_WIDTHS }],
      "font-size": [
        { text: ["h1", "h2", "h3", "h4", "body", "small", "tiny", "mono"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
