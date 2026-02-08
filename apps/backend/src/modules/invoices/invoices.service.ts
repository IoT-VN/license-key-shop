import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

/**
 * Invoice service
 * Handles invoice generation and retrieval
 */
@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate invoice for purchase
   */
  async generateInvoice(purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        product: true,
        licenseKey: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        transactions: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException("Purchase not found");
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${purchase.id.slice(-6).toUpperCase()}`;

    // Invoice metadata
    const invoiceData = {
      invoiceNumber,
      purchaseId: purchase.id,
      date: purchase.createdAt,
      customer: {
        name: purchase.user.name || "N/A",
        email: purchase.user.email,
      },
      product: {
        name: purchase.product.name,
        description: purchase.product.description,
        price: Number(purchase.amount),
        currency: purchase.currency,
      },
      licenseKey: purchase.licenseKey?.keyString || null,
      total: Number(purchase.amount),
      status: purchase.status,
      stripePaymentId: purchase.stripePaymentId,
      stripeSubscriptionId: purchase.stripeSubscriptionId,
    };

    // Update purchase metadata with invoice info
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        metadata: {
          ...(purchase.metadata as any),
          invoiceNumber,
        },
      },
    });

    this.logger.log(`Generated invoice: ${invoiceNumber}`);

    return invoiceData;
  }

  /**
   * Get invoice by purchase ID
   */
  async getInvoice(purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        product: true,
        licenseKey: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException("Purchase not found");
    }

    const invoiceNumber = (purchase.metadata as any)?.invoiceNumber || `INV-${purchase.id.slice(-6).toUpperCase()}`;

    return {
      invoiceNumber,
      purchaseId: purchase.id,
      date: purchase.createdAt,
      customer: {
        name: purchase.user.name || "N/A",
        email: purchase.user.email,
      },
      product: {
        name: purchase.product.name,
        description: purchase.product.description,
        price: Number(purchase.amount),
        currency: purchase.currency,
      },
      licenseKey: purchase.licenseKey?.keyString || null,
      total: Number(purchase.amount),
      status: purchase.status,
      transactions: purchase.transactions.map((t) => ({
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        date: t.createdAt,
        stripeTxId: t.stripeTxId,
      })),
    };
  }

  /**
   * Get all invoices for user
   */
  async getUserInvoices(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.purchase.count({ where: { userId } }),
    ]);

    const invoices = purchases.map((purchase) => ({
      invoiceNumber: (purchase.metadata as any)?.invoiceNumber || `INV-${purchase.id.slice(-6).toUpperCase()}`,
      purchaseId: purchase.id,
      date: purchase.createdAt,
      productName: purchase.product.name,
      amount: Number(purchase.amount),
      currency: purchase.currency,
      status: purchase.status,
    }));

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
