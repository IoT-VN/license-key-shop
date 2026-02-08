import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

/**
 * SePay transaction interface
 */
interface SePayTransaction {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: "in" | "out";
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
}

/**
 * SePay API response interface
 */
interface SePayApiResponse {
  status: number;
  transactions?: SePayTransaction[];
  error?: string;
  message?: string;
}

/**
 * SePay webhook payload interface
 */
interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: "in" | "out";
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
}

/**
 * QR code generation parameters
 */
interface QRCodeParams {
  account: string;
  bank: string;
  amount?: number;
  description?: string;
  template?: "default" | "compact" | "qronly";
}

/**
 * SePay service
 * Handles SePay payment gateway integration for Vietnamese banks
 */
@Injectable()
export class SePayService {
  private readonly logger = new Logger(SePayService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly bankAccount: string;
  private readonly bankCode: string;
  private readonly qrBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>("SEPAY_API_URL", "https://my.sepay.vn/userapi");
    this.apiKey = this.config.get<string>("SEPAY_API_KEY", "");

    if (!this.apiKey) {
      this.logger.warn("SEPAY_API_KEY is not configured");
    }

    this.bankAccount = this.config.get<string>("SEPAY_BANK_ACCOUNT", "");
    this.bankCode = this.config.get<string>("SEPAY_BANK_CODE", "");
    this.qrBaseUrl = this.config.get<string>("SEPAY_QR_URL", "https://qr.sepay.vn/img");

    if (!this.bankAccount || !this.bankCode) {
      this.logger.warn("SEPAY_BANK_ACCOUNT or SEPAY_BANK_CODE is not configured");
    }
  }

  /**
   * Generate payment QR code URL
   */
  generateQRCode(params: QRCodeParams): string {
    try {
      const url = new URL(this.qrBaseUrl);

      url.searchParams.set("acc", params.account);
      url.searchParams.set("bank", params.bank);

      if (params.amount) {
        url.searchParams.set("amount", params.amount.toString());
      }

      if (params.description) {
        url.searchParams.set("des", params.description);
      }

      if (params.template) {
        url.searchParams.set("template", params.template);
      }

      this.logger.log(`Generated QR code for bank: ${params.bank}, amount: ${params.amount}`);
      return url.toString();
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      throw new BadRequestException("Failed to generate QR code");
    }
  }

  /**
   * Create payment with QR code
   */
  async createPayment(params: {
    amount: number;
    currency: string;
    description: string;
    orderId: string;
  }): Promise<{
    qrCodeUrl: string;
    accountNumber: string;
    bankCode: string;
    amount: number;
    description: string;
    orderId: string;
  }> {
    try {
      if (!this.bankAccount || !this.bankCode) {
        throw new Error("Bank account or bank code not configured");
      }

      // Generate QR code URL
      const qrCodeUrl = this.generateQRCode({
        account: this.bankAccount,
        bank: this.bankCode,
        amount: params.amount,
        description: params.description,
        template: "default",
      });

      this.logger.log(`Created payment for order: ${params.orderId}`);

      return {
        qrCodeUrl,
        accountNumber: this.bankAccount,
        bankCode: this.bankCode,
        amount: params.amount,
        description: params.description,
        orderId: params.orderId,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw new BadRequestException("Failed to create payment");
    }
  }

  /**
   * Verify webhook signature
   * SePay webhooks use API key authentication
   */
  verifyWebhook(authHeader: string): boolean {
    try {
      if (!authHeader) {
        this.logger.warn("Missing authorization header");
        return false;
      }

      // Expected format: "Apikey YOUR_KEY" or "Bearer YOUR_KEY"
      const parts = authHeader.split(" ");
      if (parts.length < 2) {
        this.logger.warn("Invalid authorization header format");
        return false;
      }

      const providedKey = parts[1];

      if (providedKey !== this.apiKey) {
        this.logger.warn("Invalid webhook signature");
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Webhook verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: any): SePayWebhookPayload {
    try {
      const transaction: SePayWebhookPayload = {
        id: payload.id,
        gateway: payload.gateway,
        transactionDate: payload.transactionDate || payload.transaction_date,
        accountNumber: payload.accountNumber || payload.account_number,
        code: payload.code || null,
        content: payload.content,
        transferType: payload.transferType || payload.transfer_type,
        transferAmount: Number(payload.transferAmount || payload.transfer_amount),
        accumulated: Number(payload.accumulated),
        subAccount: payload.subAccount || payload.sub_account || null,
        referenceCode: payload.referenceCode || payload.reference_code,
      };

      this.logger.log(`Parsed webhook transaction: ${transaction.id}`);
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to parse webhook payload: ${error.message}`);
      throw new BadRequestException("Invalid webhook payload");
    }
  }

  /**
   * Check if transaction is a payment
   */
  isPaymentTransaction(transaction: SePayWebhookPayload): boolean {
    return transaction.transferType === "in" && transaction.transferAmount > 0;
  }

  /**
   * Extract order ID from transaction content
   * Expected format: "Order {orderId}" or "{orderId}"
   */
  extractOrderId(content: string): string | null {
    try {
      // Try to extract order ID from content
      const patterns = [
        /order\s+([a-zA-Z0-9-]+)/i,
        /#([a-zA-Z0-9-]+)/,
        /^([a-zA-Z0-9-]+)$/,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to extract order ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get transaction by ID from SePay API
   */
  async getTransaction(transactionId: number): Promise<SePayTransaction | null> {
    try {
      if (!this.apiKey) {
        throw new Error("API key not configured");
      }

      const response = await fetch(
        `${this.apiUrl}/transactions/details/${transactionId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        this.logger.error(`SePay API error: ${response.status}`);
        return null;
      }

      const data: SePayApiResponse = await response.json();

      if (data.status === 200 && data.transactions && data.transactions.length > 0) {
        return data.transactions[0];
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get transaction: ${error.message}`);
      return null;
    }
  }

  /**
   * List transactions from SePay API
   */
  async listTransactions(params?: {
    accountNumber?: string;
    limit?: number;
    sinceId?: number;
  }): Promise<SePayTransaction[]> {
    try {
      if (!this.apiKey) {
        throw new Error("API key not configured");
      }

      const url = new URL(`${this.apiUrl}/transactions/list`);

      if (params?.accountNumber) {
        url.searchParams.set("account_number", params.accountNumber);
      }

      if (params?.limit) {
        url.searchParams.set("limit", params.limit.toString());
      }

      if (params?.sinceId) {
        url.searchParams.set("since_id", params.sinceId.toString());
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.logger.error(`SePay API error: ${response.status}`);
        return [];
      }

      const data: SePayApiResponse = await response.json();

      if (data.status === 200 && data.transactions) {
        return data.transactions;
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to list transactions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get bank account information
   */
  getBankInfo(): { accountNumber: string; bankCode: string } {
    return {
      accountNumber: this.bankAccount,
      bankCode: this.bankCode,
    };
  }

  /**
   * Format amount to VND currency
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

  /**
   * Generate unique payment code for order matching
   */
  generatePaymentCode(orderId: string): string {
    return `ORDER_${orderId}_${randomUUID().slice(0, 8)}`;
  }
}
