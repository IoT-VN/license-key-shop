import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { SePayService } from "./sepay.service";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

/**
 * SePay metadata interface
 */
interface SePayMetadata {
  productId: string;
  userId: string;
  idempotencyKey: string;
  mode: "one_time" | "subscription";
  orderId: string;
}

/**
 * Payments service
 * Business logic for payment operations using SePay
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sepay: SePayService,
    private readonly config: ConfigService
  ) {}

  /**
   * Create checkout payment with QR code
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

    // Only one-time payments supported for SePay
    if (dto.mode === "subscription") {
      throw new NotFoundException("Subscriptions not supported for SePay payments");
    }

    // Generate unique order ID
    const orderId = randomUUID();
    const idempotencyKey = randomUUID();

    // Create payment description
    const description = `ORDER_${orderId}`;

    // Convert price to VND if needed (SePay only supports VND)
    let amountInVND = Number(product.price);
    if (product.currency !== "VND") {
      // TODO: Implement currency conversion
      this.logger.warn(`Currency conversion not implemented. Using price as-is: ${amountInVND}`);
    }

    // Create SePay payment
    const payment = await this.sepay.createPayment({
      amount: amountInVND,
      currency: "VND",
      description,
      orderId,
    });

    // Store pending payment in database
    await this.prisma.purchase.create({
      data: {
        userId,
        productId: product.id,
        sepayTransactionId: null, // Will be updated on webhook
        amount: amountInVND as any,
        currency: "VND",
        status: "PENDING",
        metadata: {
          orderId,
          idempotencyKey,
          customerEmail: dto.customerEmail,
          qrCodeUrl: payment.qrCodeUrl,
        },
      },
    });

    this.logger.log(`Created checkout payment for order: ${orderId}`);

    return {
      qrCodeUrl: payment.qrCodeUrl,
      accountNumber: payment.accountNumber,
      bankCode: payment.bankCode,
      amount: payment.amount,
      description: payment.description,
      orderId: payment.orderId,
      currency: "VND",
    };
  }

  /**
   * Get order payment status
   */
  async getOrderStatus(orderId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        metadata: {
          path: ["orderId"],
          equals: orderId,
        },
      },
      include: {
        licenseKey: true,
        product: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException("Order not found");
    }

    return {
      orderId,
      status: purchase.status,
      amount: Number(purchase.amount),
      currency: purchase.currency,
      purchaseId: purchase.id,
      licenseKey: purchase.licenseKey?.keyString ?? null,
      createdAt: purchase.createdAt,
    };
  }

  /**
   * Process refund (manual - requires bank transfer)
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

    // Create refund record (manual refund via bank transfer)
    const refundAmount = amount || Number(purchase.amount);
    const refund = await this.prisma.refund.create({
      data: {
        purchaseId: purchase.id,
        amount: refundAmount as any,
        currency: purchase.currency,
        sepayRefundId: null, // Manual refund
        reason: reason || "Customer request",
        status: "PENDING",
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

    this.logger.log(`Created refund record for purchase: ${purchaseId} (manual processing required)`);
    return refund;
  }

  /**
   * Handle SePay payment webhook
   */
  async handlePaymentWebhook(transaction: {
    id: number;
    transferAmount: number;
    content: string;
    referenceCode: string;
    transactionDate: string;
    gateway: string;
  }) {
    // Extract order ID from content
    const orderId = this.sepay.extractOrderId(transaction.content);

    if (!orderId) {
      this.logger.warn(`Could not extract order ID from content: ${transaction.content}`);
      return;
    }

    // Check idempotency
    const existingPurchase = await this.prisma.purchase.findFirst({
      where: {
        sepayTransactionId: transaction.id.toString(),
      },
    });

    if (existingPurchase) {
      this.logger.log(`Purchase already exists for transaction: ${transaction.id}`);
      return;
    }

    // Find pending purchase by order ID
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        metadata: {
          path: ["orderId"],
          equals: orderId,
        },
      },
      include: {
        product: true,
      },
    });

    if (!purchase) {
      this.logger.error(`Purchase not found for order: ${orderId}`);
      return;
    }

    // Verify amount matches
    const expectedAmount = Number(purchase.amount);
    if (transaction.transferAmount !== expectedAmount) {
      this.logger.error(
        `Amount mismatch for order ${orderId}: expected ${expectedAmount}, got ${transaction.transferAmount}`
      );
      return;
    }

    // Allocate license key
    const licenseKey = await this.prisma.licenseKey.findFirst({
      where: {
        productId: purchase.productId,
        status: "AVAILABLE",
      },
    });

    if (!licenseKey) {
      this.logger.error(`No available license keys for product: ${purchase.productId}`);
      // TODO: Generate key on-the-fly or notify admin
      return;
    }

    // Update license key status
    await this.prisma.licenseKey.update({
      where: { id: licenseKey.id },
      data: {
        status: "SOLD",
        activations: 0,
        expiresAt: purchase.product.validityDays
          ? new Date(Date.now() + purchase.product.validityDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    this.logger.log(`Allocated license key: ${licenseKey.id}`);

    // Update purchase record
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        status: "COMPLETED",
        sepayTransactionId: transaction.id.toString(),
        licenseKey: {
          connect: { id: licenseKey.id },
        },
        completedAt: new Date(),
      },
    });

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        purchaseId: purchase.id,
        type: "PAYMENT",
        amount: transaction.transferAmount as any,
        currency: "VND",
        sepayTxId: transaction.referenceCode,
      },
    });

    this.logger.log(`Completed purchase: ${purchase.id} for order: ${orderId}`);

    // TODO: Send confirmation email with license key

    return purchase;
  }

  /**
   * Handle invoice.paid (subscription renewal) - Not supported for SePay
   */
  async handleInvoicePaid(_event: any) {
    this.logger.warn("Subscription handling not supported for SePay payments");
    return;
  }

  /**
   * Handle charge.refunded - Manual refund for SePay
   */
  async handleChargeRefunded(_event: any) {
    this.logger.warn("Automatic refunds not supported for SePay payments. Use manual refund process.");
    return;
  }

  /**
   * Handle customer.subscription.deleted - Not supported for SePay
   */
  async handleSubscriptionDeleted(_event: any) {
    this.logger.warn("Subscription handling not supported for SePay payments");
    return;
  }
}
