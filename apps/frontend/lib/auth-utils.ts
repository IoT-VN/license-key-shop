"use client";

import { auth } from "@clerk/nextjs/server";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

/**
 * Authentication utility functions
 * Provides helpers for current user and token retrieval
 */

/**
 * Get current user ID from Clerk session
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get current user with full details
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user details from Clerk
  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}

/**
 * Get auth token for API calls
 * Note: This should be called from server components or API routes
 * @returns JWT token or null
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await auth();
    const token = await session.getToken();
    return token;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Check if user has specific role (requires metadata to be set in Clerk)
 * @param role - Role to check (admin, customer)
 * @returns boolean indicating if user has role
 */
export async function hasRole(role: string): Promise<boolean> {
  const { sessionClaims } = await auth();

  if (!sessionClaims) {
    return false;
  }

  // Check public metadata for role
  const userMetadata = sessionClaims.metadata as { role?: string };
  return userMetadata?.role === role;
}

/**
 * Get user role from Clerk metadata
 * @returns User role or 'customer' as default
 */
export async function getUserRole(): Promise<string> {
  const hasAdminRole = await hasRole("admin");
  return hasAdminRole ? "admin" : "customer";
}
