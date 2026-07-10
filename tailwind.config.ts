import type { Config } from "tailwindcss";

/**
 * RawBlock design tokens (FRONTEND-SPEC A2–A4 / DESIGN.md).
 *
 * Two hard rules baked in:
 *  1. border-radius: 0 everywhere (the only exception — the radio inner dot —
 *     is drawn with an explicit `rounded-full` in the Radio component).
 *  2. No shadows, ever — the `boxShadow` scale is overridden to `none`.
 *
 * Hierarchy comes from border weight (thin 1px / thick 3px / heavy 5px) and
 * scale, never elevation or color.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    // Radius is globally zero. Override (not extend) so no default radii leak in.
    borderRadius: {
      none: "0px",
      DEFAULT: "0px",
      full: "9999px", // reserved solely for the radio inner dot
    },
    // No elevation in RawBlock.
    boxShadow: {
      none: "none",
    },
    extend: {
      colors: {
        black: "#000000",
        white: "#FFFFFF",
        blue: "#0000FF",
        surface: {
          base: "#FFFFFF",
          inverted: "#000000",
          sunken: "#F0F0F0",
          "hover-input": "#E8E8E8",
          disabled: "#F5F5F5",
        },
        border: {
          disabled: "#CCCCCC",
        },
        content: {
          primary: "#000000",
          secondary: "#000000",
          tertiary: "#CCCCCC",
        },
        success: "#008000",
        warning: "#FFA500",
        error: "#FF0000",
        info: "#0000FF",
      },
      fontFamily: {
        // Body default
        sans: ["var(--font-work-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // [size, { lineHeight }] — RawBlock type scale (A3)
        h1: ["64px", { lineHeight: "1.0" }],
        h2: ["48px", { lineHeight: "1.05" }],
        h3: ["32px", { lineHeight: "1.1" }],
        h4: ["22px", { lineHeight: "1.2" }],
        body: ["16px", { lineHeight: "1.6" }],
        small: ["14px", { lineHeight: "1.5" }],
        tiny: ["12px", { lineHeight: "1.4" }],
        mono: ["15px", { lineHeight: "1.5" }],
      },
      spacing: {
        // RawBlock spacing scale (A4). Coexists with Tailwind's default scale.
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "16px",
        "sp-4": "24px",
        "sp-5": "40px",
        "sp-6": "64px",
        "sp-7": "80px",
        "sp-8": "120px",
      },
      borderWidth: {
        thin: "1px",
        thick: "3px",
        heavy: "5px",
      },
      maxWidth: {
        app: "1200px",
        reading: "760px",
      },
      keyframes: {
        "toast-in": {
          "0%": { transform: "translateX(8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "toast-in": "toast-in 120ms steps(2, end)",
      },
    },
  },
  plugins: [],
};

export default config;
