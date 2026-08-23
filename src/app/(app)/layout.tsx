import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { requireUser } from "@/lib/auth";
import { limits } from "@/lib/env";
import { getProjectsCreated, currentPeriod } from "@/db/queries/usage";
import { QuotaChip } from "@/components/quota-chip";
import { LogoMark } from "@/components/logo";

/**
 * Authenticated app shell (T-013, FRONTEND-SPEC A4/A6.3).
 *
 * requireUser() is the resource-based auth gate (Clerk v7's recommended
 * pattern) layered on top of the middleware: unauthenticated access to any
 * (app) route redirects to /sign-in. The top nav carries the wordmark, quota
 * chip, and Clerk UserButton. No sidebar in v1.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const used = await getProjectsCreated(user.id, currentPeriod());

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-thick border-black">
        <nav className="mx-auto flex w-full max-w-app flex-col items-start justify-between gap-sp-3 px-sp-4 py-sp-3 md:flex-row md:items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-sp-3 text-black no-underline"
          >
            <LogoMark className="h-7 w-7" />
            <span className="font-heading text-2xl uppercase tracking-tight">
              SPEC0
            </span>
          </Link>
          <div className="flex items-center gap-sp-4">
            <QuotaChip used={used} limit={limits.freeProjectsPerMonth} />
            <UserButton
              appearance={{ elements: { avatarBox: "rounded-none" } }}
            />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-app flex-1 px-sp-4 py-sp-5">
        {children}
      </main>
    </div>
  );
}
