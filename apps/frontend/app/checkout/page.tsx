"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  validityDays: number | null;
}

interface PaymentResponse {
  success: boolean;
  qrCodeUrl?: string;
  accountNumber?: string;
  bankCode?: string;
  amount?: number;
  description?: string;
  orderId?: string;
  currency?: string;
  error?: string;
}

/**
 * Checkout page content
 * Displays product details and SePay QR code
 */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, userId } = useAuth();

  const productId = searchParams.get("product");
  const mode = (searchParams.get("mode") as "one_time" | "subscription") || "one_time";

  const [product, setProduct] = useState<Product | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
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

  const handleCreatePayment = async () => {
    if (!isSignedIn || !userId) {
      setError("Please sign in to continue");
      return;
    }

    setCreatingPayment(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          mode,
        }),
      });

      const data: PaymentResponse = await response.json();

      if (data.success && data.qrCodeUrl) {
        setPayment(data);
      } else {
        setError(data.error || "Failed to create payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  };

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

  if (payment && payment.qrCodeUrl) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Payment</h1>

            <div className="border-b pb-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {product.name}
              </h2>
              <p className="text-gray-600 mb-4">{product.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: payment.currency || "VND",
                  }).format(payment.amount || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Scan QR Code to Pay
                </h3>
                <div className="inline-block border-4 border-blue-600 rounded-lg p-4 bg-white">
                  <img
                    src={payment.qrCodeUrl}
                    alt="Payment QR Code"
                    className="w-64 h-64"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-gray-700">Bank Transfer Details</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank:</span>
                    <span className="font-medium">{payment.bankCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Number:</span>
                    <span className="font-medium font-mono">{payment.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: payment.currency || "VND",
                      }).format(payment.amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Content:</span>
                    <span className="font-medium font-mono text-xs">{payment.description}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Open your banking app</li>
                  <li>Scan the QR code or enter bank details manually</li>
                  <li>Enter the exact amount shown above</li>
                  <li>Use the content/message exactly as shown</li>
                  <li>Complete the transfer</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.location.href = `/dashboard?order=${payment.orderId}`}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Check Payment Status
                </button>
                <button
                  onClick={() => setPayment(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: product.currency,
                }).format(product.price)}
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-700">License Details</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Instant delivery via email</li>
              <li>• Secure payment via SePay (VietQR)</li>
              {product.validityDays ? (
                <li>• Valid for {product.validityDays} days</li>
              ) : (
                <li>• Lifetime license</li>
              )}
            </ul>
          </div>

          {!isSignedIn ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                Please sign in to continue with your purchase
              </p>
            </div>
          ) : null}

          <button
            onClick={handleCreatePayment}
            disabled={!isSignedIn || creatingPayment}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {creatingPayment ? "Creating Payment..." : "Generate QR Code"}
          </button>

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
