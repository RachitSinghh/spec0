/**
 * RawBlock appearance for Clerk's prebuilt components (T-011, FRONTEND-SPEC A6.2).
 *
 * Square everything (0px radius), 3px black borders, black primary button with
 * uppercase tracking + full-inversion hover, Archivo Black headings, no shadows,
 * mono inputs, red (#FF0000) error borders. This is a plain object of class
 * strings, so it is serializable and safe to pass from a Server Component.
 * Typed structurally by the `appearance` prop on <SignIn/> / <SignUp/>.
 */
export const rawblockClerkAppearance = {
  variables: {
    colorPrimary: "#000000",
    colorText: "#000000",
    colorBackground: "#FFFFFF",
    colorDanger: "#FF0000",
    colorInputBackground: "#F0F0F0",
    colorInputText: "#000000",
    borderRadius: "0px",
    fontFamily: "var(--font-work-sans)",
  },
  elements: {
    rootBox: "w-full",
    card: "border-[3px] border-black rounded-none shadow-none bg-white",
    cardBox: "rounded-none shadow-none border-none",
    headerTitle:
      "font-heading uppercase tracking-wide text-black text-3xl",
    headerSubtitle: "text-black",
    socialButtonsBlockButton:
      "border-[3px] border-black rounded-none shadow-none hover:bg-black hover:text-white uppercase tracking-wide",
    dividerLine: "bg-black h-[2px]",
    dividerText: "font-mono uppercase text-black",
    formFieldLabel: "font-heading uppercase text-[14px] text-black",
    formFieldInput:
      "rounded-none border-[3px] border-black bg-surface-sunken font-mono text-black shadow-none focus:border-[5px] focus:shadow-none",
    formFieldInputShowPasswordButton: "text-black",
    formButtonPrimary:
      "rounded-none border-[3px] border-black bg-black text-white uppercase tracking-[2px] font-semibold shadow-none hover:bg-white hover:text-black",
    footerActionLink: "text-blue underline",
    identityPreviewEditButton: "text-blue underline",
    formFieldErrorText: "text-error font-sans text-[12px]",
    // Error state: 3px red border on inputs (A6.2).
    formFieldInput__error: "border-[3px] border-error",
    alert: "rounded-none border-[3px] border-error shadow-none",
    otpCodeFieldInput:
      "rounded-none border-[3px] border-black bg-surface-sunken shadow-none",
    footer: "shadow-none",
  },
};
