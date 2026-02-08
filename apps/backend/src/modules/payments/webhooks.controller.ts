import { Controller, Post, Body, Logger, Headers } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { SePayService } from "./sepay.service";

/**
 * SePay webhook controller
 * Handles incoming webhook events from SePay
 */
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly sepay: SePayService
  ) {}

  /**
   * Handle SePay webhook events
   * POST /webhooks/sepay
   */
  @Post("sepay")
  async handleSePayWebhook(
    @Body() payload: any,
    @Headers("authorization") authHeader: string
  ) {
    try {
      // Verify webhook signature
      const isValid = this.sepay.verifyWebhook(authHeader);

      if (!isValid) {
        this.logger.warn("Invalid webhook signature");
        return { received: false, error: "Invalid signature" };
      }

      // Parse webhook payload
      const transaction = this.sepay.parseWebhookPayload(payload);

      this.logger.log(
        `Processing SePay webhook: transaction ${transaction.id}, amount: ${transaction.transferAmount}`
      );

      // Check if this is a payment transaction
      if (!this.sepay.isPaymentTransaction(transaction)) {
        this.logger.log(`Skipping non-payment transaction: ${transaction.id}`);
        return { received: true };
      }

      // Handle payment
      await this.payments.handlePaymentWebhook(transaction);

      return { received: true, success: true };
    } catch (error: any) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      // Still return 200 to avoid SePay retries
      return { received: false, error: error.message };
    }
  }
}
