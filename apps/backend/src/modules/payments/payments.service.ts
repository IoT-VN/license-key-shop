import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { StripeService } from "./stripe.service";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { StripeMetadata } from "../../common/types/metadata.types";

/**
 * Payments service
 * Business logic for payment operations
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService
  ) {}

  /**
   * Create checkout session
   */
  async createCheckout(userId: string, dto: {
    productId: string;
    mode: "one_time" | "subscription";
    interval?: "month" | "year";
    customerEmail?: string;
  }) {
    // Get product details
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (!product.isActive) {
      throw new NotFoundException("Product is not available");
    }

    // Generate idempotency key
    const idempotencyKey = randomUUID();

    // Build URLs
    const baseUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3000");
    const successUrl = `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout`;

    // Create metadata
    const metadata = {
      productId: product.id,
      userId,
      idempotencyKey,
      mode: dto.mode,
    };

    // Create checkout session
    let session;
    if (dto.mode === "subscription") {
      if (!dto.interval) {
        throw new Error("Interval required for subscription");
      }

      session = await this.stripe.createSubscriptionSession({
        productId: product.id,
        productName: product.name,
        amount: Number(product.price),
        currency: product.currency,
        interval: dto.interval,
        successUrl,
        cancelUrl,
        customerEmail: dto.customerEmail,
        metadata,
      });
    } else {
      session = await this.stripe.createCheckoutSession({
        productId: product.id,
        productName: product.name,
        amount: Number(product.price),
        currency: product.currency,
        successUrl,
        cancelUrl,
        customerEmail: dto.customerEmail,
        metadata,
      });
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Get checkout session status
   */
  async getSessionStatus(sessionId: string) {
    const session = await this.stripe.getCheckoutSession(sessionId);

    // Check if we have a purchase record
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        stripePaymentId: session.payment_intent as string,
      },
      include: {
        licenseKey: true,
        product: true,
      },
    });

    return {
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      purchaseId: purchase?.id ?? null,
      licenseKey: purchase?.licenseKey?.keyString ?? null,
    };
  }

  /**
   * Process refund
   */
  async processRefund(purchaseId: string, amount?: number, reason?: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        licenseKey: true,
        refund: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException("Purchase not found");
    }

    if (purchase.status !== "COMPLETED") {
      throw new Error("Can only refund completed purchases");
    }

    if (purchase.refund) {
      throw new Error("Refund already processed");
    }

    if (!purchase.stripePaymentId) {
      throw new Error("No payment intent associated with this purchase");
    }

    // Process refund via Stripe
    const stripeRefund = await this.stripe.processRefund({
      paymentIntentId: purchase.stripePaymentId,
      amount,
      reason,
    });

    // Create refund record
    const refundAmount = amount || Number(purchase.amount);
    const refund = await this.prisma.refund.create({
      data: {
        purchaseId: purchase.id,
        amount: refundAmount as any,
        currency: purchase.currency,
        stripeRefundId: stripeRefund.id,
        reason: reason || "Customer request",
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    // Revoke license key if exists
    if (purchase.licenseKey) {
      await this.prisma.licenseKey.update({
        where: { id: purchase.licenseKey.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: "Refund processed",
        },
      });

      this.logger.log(`Revoked license key: ${purchase.licenseKey.id}`);
    }

    // Update purchase status
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "REFUNDED" },
    });

    this.logger.log(`Processed refund for purchase: ${purchaseId}`);
    return refund;
  }

  /**
   * Handle checkout.session.completed webhook
   */
  async handleCheckoutCompleted(event: {
    metadata: StripeMetadata;
    payment_intent?: string;
    customer_details?: { email?: string };
    subscription?: string;
  }) {
    const { metadata, payment_intent, customer_details, subscription } = event;

    if (!metadata?.productId || !metadata?.userId) {
      this.logger.error("Missing metadata in checkout session");
      return;
    }

    // Check idempotency
    const existingPurchase = await this.prisma.purchase.findFirst({
      where: {
        stripePaymentId: payment_intent as string,
      },
    });

    if (existingPurchase) {
      this.logger.log(`Purchase already exists for payment: ${payment_intent}`);
      return;
    }

    // Get product details
    const product = await this.prisma.product.findUnique({
      where: { id: metadata.productId },
    });

    if (!product) {
      this.logger.error(`Product not found: ${metadata.productId}`);
      return;
    }

    // Allocate license key (only for one-time payments)
    let licenseKey = null;
    if (!subscription) {
      licenseKey = await this.prisma.licenseKey.findFirst({
        where: {
          productId: product.id,
          status: "AVAILABLE",
        },
      });

      if (!licenseKey) {
        this.logger.error(`No available license keys for product: ${product.id}`);
        // TODO: Generate key on-the-fly or notify admin
        return;
      }

      // Update license key status
      licenseKey = await this.prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: {
          status: "SOLD",
          activations: 0,
          expiresAt: product.validityDays
            ? new Date(Date.now() + product.validityDays * 24 * 60 * 60 * 1000)
            : null,
        },
      });

      this.logger.log(`Allocated license key: ${licenseKey.id}`);
    }

    // Create purchase record
    const amount = event.amount_total ? event.amount_total / 100 : 0;
    const purchase = await this.prisma.purchase.create({
      data: {
        userId: metadata.userId,
        productId: product.id,
        stripePaymentId: payment_intent as string,
        stripeSubscriptionId: subscription as string | undefined,
        stripeInvoiceId: null, // Will be updated by invoice.paid
        amount: amount as any,
        currency: event.currency || "USD",
        status: "COMPLETED",
        licenseKey: licenseKey ? { connect: { id: licenseKey.id } } : undefined,
        metadata: {
          customerEmail: customer_details?.email,
          idempotencyKey: metadata.idempotencyKey,
        },
      },
    });

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        purchaseId: purchase.id,
        type: "PAYMENT",
        amount: amount as any,
        currency: event.currency || "USD",
        stripeTxId: payment_intent as string,
      },
    });

    this.logger.log(`Created purchase: ${purchase.id} for user: ${metadata.userId}`);

    // TODO: Send confirmation email with license key

    return purchase;
  }

  /**
   * Handle invoice.paid (subscription renewal)
   */
  async handleInvoicePaid(event: {
    subscription?: string;
    customer?: string;
    payment_intent?: string;
  }) {
    const { subscription, customer, payment_intent } = event;

    if (!subscription) {
      return;
    }

    // Find purchase by subscription ID
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        stripeSubscriptionId: subscription as string,
      },
      include: {
        product: true,
        licenseKey: true,
      },
    });

    if (!purchase) {
      this.logger.error(`Purchase not found for subscription: ${subscription}`);
      return;
    }

    // Update license key expiry
    if (purchase.licenseKey && purchase.product.validityDays) {
      const currentExpiry = purchase.licenseKey.expiresAt || new Date();
      const newExpiry = new Date(
        currentExpiry.getTime() + purchase.product.validityDays * 24 * 60 * 60 * 1000
      );

      await this.prisma.licenseKey.update({
        where: { id: purchase.licenseKey.id },
        data: { expiresAt: newExpiry },
      });

      this.logger.log(`Extended license key expiry: ${purchase.licenseKey.id}`);
    }

    // Update invoice ID
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeInvoiceId: event.id },
    });

    // Create transaction record
    const amount = event.amount_paid ? event.amount_paid / 100 : 0;
    await this.prisma.transaction.create({
      data: {
        purchaseId: purchase.id,
        type: "PAYMENT",
        amount: amount as any,
        currency: event.currency || "USD",
        stripeTxId: payment_intent as string,
      },
    });

    this.logger.log(`Processed subscription renewal: ${subscription}`);
  }

  /**
   * Handle charge.refunded
   */
  async handleChargeRefunded(event: any) {
    const { payment_intent, amount } = event;

    if (!payment_intent) {
      return;
    }

    // Find purchase by payment intent
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        stripePaymentId: payment_intent as string,
      },
      include: {
        licenseKey: true,
      },
    });

    if (!purchase) {
      this.logger.error(`Purchase not found for payment: ${payment_intent}`);
      return;
    }

    // Revoke license key
    if (purchase.licenseKey) {
      await this.prisma.licenseKey.update({
        where: { id: purchase.licenseKey.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: "Refunded",
        },
      });

      this.logger.log(`Revoked license key: ${purchase.licenseKey.id}`);
    }

    // Create refund record if not exists
    const existingRefund = await this.prisma.refund.findUnique({
      where: { purchaseId: purchase.id },
    });

    if (!existingRefund) {
      const refundAmount = amount ? amount / 100 : 0;
      await this.prisma.refund.create({
        data: {
          purchaseId: purchase.id,
          amount: refundAmount as any,
          currency: event.currency || "USD",
          stripeRefundId: event.refund as string || null,
          reason: "Refunded via Stripe",
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });
    }

    // Update purchase status
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "REFUNDED" },
    });

    this.logger.log(`Processed refund for purchase: ${purchase.id}`);
  }

  /**
   * Handle customer.subscription.deleted
   */
  async handleSubscriptionDeleted(event: any) {
    const { id } = event;

    // Find purchase by subscription ID
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        stripeSubscriptionId: id,
      },
      include: {
        licenseKey: true,
      },
    });

    if (!purchase) {
      this.logger.error(`Purchase not found for subscription: ${id}`);
      return;
    }

    // Revoke license key
    if (purchase.licenseKey) {
      await this.prisma.licenseKey.update({
        where: { id: purchase.licenseKey.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: "Subscription cancelled",
        },
      });

      this.logger.log(`Revoked license key for cancelled subscription: ${purchase.licenseKey.id}`);
    }

    this.logger.log(`Cancelled subscription: ${id}`);
  }
}
