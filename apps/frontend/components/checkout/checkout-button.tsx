"use client";

import { useState } from "react";
import { redirectToCheckout } from "@/lib/stripe";

interface CheckoutButtonProps {
  productId: string;
  mode: "one_time" | "subscription";
  interval?: "month" | "year";
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Checkout button component
 * Redirects user to Stripe Checkout
 */
export function CheckoutButton({
  productId,
  mode,
  interval,
  children = "Buy Now",
  className = "",
  disabled = false,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await redirectToCheckout({
        productId,
        mode,
        interval,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {isLoading ? "Processing..." : children}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
