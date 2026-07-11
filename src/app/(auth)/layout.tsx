import Link from "next/link";

/**
 * Auth shell — one centered column for the combined sign-in/up flow.
 * Wordmark on top links back to the marketing page.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-sp-5 p-sp-4">
      <Link
        href="/"
        className="font-heading text-2xl uppercase tracking-tight text-black no-underline"
      >
        SPEC0
      </Link>
      <div className="flex w-full max-w-[420px] flex-col items-center">
        {children}
      </div>
    </main>
  );
}
