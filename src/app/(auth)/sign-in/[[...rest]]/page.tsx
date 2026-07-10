import { SignIn } from "@clerk/nextjs";

import { rawblockClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-sp-5 p-sp-5">
      <h1 className="text-h3 uppercase">SIGN IN</h1>
      <SignIn
        appearance={rawblockClerkAppearance}
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
