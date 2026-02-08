import Link from 'next/link';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">License Key Shop</h1>
            </div>
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Purchase Software Licenses
            <span className="block text-blue-600">Securely & Instantly</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Get your software license keys instantly after purchase. Manage all your
            licenses in one place with our easy-to-use dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <Link
              href="/checkout"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              Browse Products
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-3xl">⚡</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Instant Delivery</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get your license keys immediately after purchase via email and dashboard
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-3xl">🔒</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Secure Payments</h3>
            <p className="mt-2 text-sm text-gray-600">
              Powered by Stripe for secure and reliable payment processing
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-3xl">📊</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Easy Management
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Track all your purchases and manage licenses from your dashboard
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-3xl">🔑</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Cryptographic Security
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              ECDSA-P256 signed keys for maximum security and verification
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-3xl">🌐</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Public API</h3>
            <p className="mt-2 text-sm text-gray-600">
              Validate license keys from anywhere using our public API
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-3xl">💰</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Flexible Pricing
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              One-time purchases and subscription options available
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
