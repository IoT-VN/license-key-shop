import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk authentication middleware
 * Protects routes and manages auth state
 */

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/", // Home page is public
]);

export default clerkMiddleware(async (auth, request) => {
  // Allow public routes
  if (isPublicRoute(request)) {
    return;
  }

  // Protect all other routes - redirect to sign-in if not authenticated
  const session = await auth();
  if (!session.userId) {
    return session.redirectToSignIn();
  }
});

export const config = {
  // Matcher defines which routes the middleware should run on
  matcher: [
    // Skip API routes that handle their own auth
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    // Include API routes for webhooks
    "/api/webhooks/(.*)",
  ],
};
