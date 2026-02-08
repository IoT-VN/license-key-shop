import { Controller, Post, Body, Logger, Headers } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { StripeService } from "./stripe.service";
import { WebhookDto } from "./dto/webhook.dto";

/**
 * Stripe webhook controller
 * Handles incoming webhook events from Stripe
 */
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly stripe: StripeService
  ) {}

  /**
   * Handle Stripe webhook events
   * POST /webhooks/stripe
   */
  @Post("stripe")
  async handleStripeWebhook(
    @Body() dto: WebhookDto,
    @Headers("stripe-signature") signature: string
  ) {
    try {
      // Verify webhook signature
      const event = this.stripe.constructWebhookEvent(
        dto.payload,
        signature
      );

      this.logger.log(`Processing webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed":
          await this.payments.handleCheckoutCompleted(event.data.object);
          break;

        case "invoice.paid":
          await this.payments.handleInvoicePaid(event.data.object);
          break;

        case "invoice.payment_failed":
          this.logger.warn(
            `Invoice payment failed: ${event.data.object.id}`
          );
          // TODO: Handle failed subscription payment
          break;

        case "charge.refunded":
          await this.payments.handleChargeRefunded(event.data.object);
          break;

        case "customer.subscription.deleted":
          await this.payments.handleSubscriptionDeleted(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      // Still return 200 to avoid Stripe retries
      return { received: false, error: error.message };
    }
  }
}
