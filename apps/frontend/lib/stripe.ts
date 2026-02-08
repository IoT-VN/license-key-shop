/**
 * Stripe utility functions
 */

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured");
}

/**
 * Load Stripe.js
 */
export const loadStripe = () => {
  return import("@stripe/stripe-js").then((module) =>
    module.loadStripe(STRIPE_PUBLISHABLE_KEY || "")
  );
};

/**
 * Create checkout session
 */
export async function createCheckoutSession(params: {
  productId: string;
  mode: "one_time" | "subscription";
  interval?: "month" | "year";
}) {
  try {
    const response = await fetch("/api/payments/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create checkout session");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create checkout error:", error);
    throw error;
  }
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(params: {
  productId: string;
  mode: "one_time" | "subscription";
  interval?: "month" | "year";
}) {
  const { checkoutUrl } = await createCheckoutSession(params);

  if (checkoutUrl) {
    window.location.href = checkoutUrl;
  } else {
    throw new Error("No checkout URL returned");
  }
}

/**
 * Get checkout session status
 */
export async function getSessionStatus(sessionId: string) {
  try {
    const response = await fetch(`/api/payments/session/${sessionId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to get session status");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get session status error:", error);
    throw error;
  }
}
