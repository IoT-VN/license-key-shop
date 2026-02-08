"use client";

import { SignUpButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Sign-up button for unauthenticated users
 * Redirects to Clerk sign-up page
 */
export function SignUpButtonComponent() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return null;
  }

  return (
    <SignUpButton mode="modal">
      <Button variant="outline">Sign Up</Button>
    </SignUpButton>
  );
}
