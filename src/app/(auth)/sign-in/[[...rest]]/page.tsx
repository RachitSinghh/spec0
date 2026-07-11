import { SignIn } from "@clerk/nextjs";

import { rawblockClerkAppearance } from "@/lib/clerk-appearance";

/**
 * Combined sign-in-or-up flow (Clerk `withSignUp`): one page handles both —
 * an unknown email flows straight into account creation. /sign-up redirects
 * here.
 */
export default function SignInPage() {
  return (
    <SignIn
      appearance={rawblockClerkAppearance}
      fallbackRedirectUrl="/dashboard"
      withSignUp
    />
  );
}
