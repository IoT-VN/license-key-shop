"use client";

import { UserButton } from "@clerk/nextjs";

/**
 * User account button component
 * Displays user menu with account management and sign-out
 */
export function UserAccountButton() {
  return <UserButton afterSignOutUrl="/sign-in" />;
}
