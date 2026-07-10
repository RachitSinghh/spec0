import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Route protection (T-010).
 *
 * The authenticated app shell — everything under the (app) route group, which
 * resolves to /dashboard and /projects/* — requires a session. Marketing (/),
 * auth (/sign-in, /sign-up), and unauthenticated machine endpoints (webhooks,
 * the Inngest serve route) stay public. Webhooks verify their own signatures.
 */
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/projects(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|map)).*)",
    // Always run on API/tRPC routes.
    "/(api|trpc)(.*)",
  ],
};
