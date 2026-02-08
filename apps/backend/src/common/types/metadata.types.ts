/**
 * Product metadata interface
 * Contains feature flags and product-specific information
 */
export interface ProductMetadata {
  features?: string[];
  version?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

/**
 * Validation metadata interface
 * Contains contextual information about validation requests
 */
export interface ValidationMetadata {
  ipAddress?: string;
  userAgent?: string;
  validationReason?: string;
  [key: string]: unknown;
}

/**
 * Stripe metadata interface
 * Metadata attached to Stripe payments and subscriptions
 */
export interface StripeMetadata {
  productId?: string;
  productName?: string;
  userId?: string;
  [key: string]: string | undefined;
}

/**
 * Cache entry interface
 * Generic cache value with optional expiry
 */
export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: Date;
}

/**
 * Webhook event metadata
 * Additional context from payment webhooks
 */
export interface WebhookMetadata {
  eventType?: string;
  eventId?: string;
  timestamp?: number;
  [key: string]: unknown;
}
