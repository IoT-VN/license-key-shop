import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

/**
 * Stripe service
 * Handles direct Stripe API interactions
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly taxId: string | undefined;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    } as any);

    this.webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET", "");
    this.taxId = this.config.get<string>("STRIPE_TAX_ID");
  }

  /**
   * Create checkout session for one-time payment
   */
  async createCheckoutSession(params: {
    productId: string;
    productName: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: params.currency,
              product_data: {
                name: params.productName,
                metadata: {
                  productId: params.productId,
                },
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: params.metadata || {},
        automatic_tax: {
          enabled: !!this.taxId,
        },
      });

      this.logger.log(`Created checkout session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error.message}`);
      throw new BadRequestException("Failed to create checkout session");
    }
  }

  /**
   * Create checkout session for subscription
   */
  async createSubscriptionSession(params: {
    productId: string;
    productName: string;
    amount: number;
    currency: string;
    interval: "month" | "year";
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    try {
      // Check if price already exists
      let price: Stripe.Price;

      const existingPrices = await this.stripe.prices.list({
        product: params.productId,
        active: true,
        limit: 100,
      });

      const matchingPrice = existingPrices.data.find(
        (p) =>
          p.recurring?.interval === params.interval &&
          p.unit_amount === Math.round(params.amount * 100)
      );

      if (matchingPrice) {
        price = matchingPrice;
      } else {
        // Create new price
        price = await this.stripe.prices.create({
          product_data: {
            name: params.productName,
            metadata: { productId: params.productId },
          },
          unit_amount: Math.round(params.amount * 100),
          currency: params.currency,
          recurring: {
            interval: params.interval,
          },
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: params.metadata || {},
        automatic_tax: {
          enabled: !!this.taxId,
        },
      });

      this.logger.log(`Created subscription checkout session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create subscription session: ${error.message}`);
      throw new BadRequestException("Failed to create subscription session");
    }
  }

  /**
   * Retrieve checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      this.logger.error(`Failed to retrieve session: ${error.message}`);
      throw new BadRequestException("Session not found");
    }
  }

  /**
   * Process refund
   */
  async processRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount
          ? Math.round(params.amount * 100)
          : undefined,
        reason: (params.reason as Stripe.RefundCreateParams.Reason) || "requested_by_customer",
      });

      this.logger.log(`Processed refund: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error.message}`);
      throw new BadRequestException("Failed to process refund");
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Cancelled subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw new BadRequestException("Failed to cancel subscription");
    }
  }

  /**
   * Construct webhook event from payload
   */
  constructWebhookEvent(payload: string, signature: string): Stripe.Event {
    try {
      if (!this.webhookSecret) {
        throw new Error("Webhook secret not configured");
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      this.logger.log(`Received webhook event: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException("Invalid webhook signature");
    }
  }

  /**
   * Get Stripe client for advanced operations
   */
  getClient(): Stripe {
    return this.stripe;
  }
}
