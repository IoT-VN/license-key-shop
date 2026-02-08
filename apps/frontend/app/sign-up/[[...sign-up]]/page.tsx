import { SignUp } from "@clerk/nextjs";

/**
 * Sign-up page using Clerk's pre-built UI
 * Supports email/password and OAuth providers (Google, GitHub)
 */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUp />
    </div>
  );
}
