"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Sign-in button for unauthenticated users
 * Redirects to Clerk sign-in page
 */
export function SignInButtonComponent() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return null;
  }

  return (
    <SignInButton mode="modal">
      <Button variant="default">Sign In</Button>
    </SignInButton>
  );
}
