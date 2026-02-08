"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckoutButton } from "@/components/checkout/checkout-button";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  validityDays: number | null;
}

/**
 * Checkout page content
 * Displays product details and checkout button
 */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");
  const mode = (searchParams.get("mode") as "one_time" | "subscription") || "one_time";
  const interval = searchParams.get("interval") as "month" | "year" | undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setError("No product selected");
      setLoading(false);
      return;
    }

    // Fetch product details
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProduct(data.product);
        } else {
          setError(data.error || "Failed to load product");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load product");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Product not found"}</p>
          <a href="/" className="mt-4 text-blue-600 hover:underline">
            Go back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {product.name}
            </h2>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-blue-600">
                ${product.price}
              </span>
              <span className="text-gray-500">{product.currency}</span>
            </div>
            {mode === "subscription" && interval && (
              <p className="text-sm text-gray-500 mt-2">
                Billed {interval === "month" ? "monthly" : "yearly"}
              </p>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-700">License Details</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Instant delivery via email</li>
              <li>• Secure payment via Stripe</li>
              {product.validityDays ? (
                <li>• Valid for {product.validityDays} days</li>
              ) : (
                <li>• Lifetime license</li>
              )}
              {mode === "subscription" && (
                <li>• Cancel anytime</li>
              )}
            </ul>
          </div>

          <CheckoutButton
            productId={product.id}
            mode={mode}
            interval={interval}
            className="w-full"
          >
            Proceed to Payment
          </CheckoutButton>

          <p className="mt-4 text-xs text-gray-500 text-center">
            By proceeding, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Checkout page with Suspense boundary
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
