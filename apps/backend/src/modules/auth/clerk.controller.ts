import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from "@nestjs/common";
import { ClerkService } from "./clerk.service";
import type { WebhookEvent } from "@clerk/backend";

/**
 * Clerk webhook controller
 * Receives webhook events from Clerk and syncs user data
 */
@Controller("webhooks")
export class ClerkController {
  private readonly logger = new Logger(ClerkController.name);

  constructor(private readonly clerkService: ClerkService) {}

  @Post("clerk")
  @HttpCode(HttpStatus.OK)
  async handleClerkWebhook(@Body() event: WebhookEvent) {
    try {
      this.logger.log(`Received Clerk webhook: ${event.type}`);

      switch (event.type) {
        case "user.created":
          await this.clerkService.handleUserCreated(event.data.id, event.data);
          break;

        case "user.updated":
          await this.clerkService.handleUserUpdated(event.data.id, event.data);
          break;

        case "user.deleted":
          if (event.data.id) {
            await this.clerkService.handleUserDeleted(event.data.id);
          }
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook handler error: ${error.message}`);
      throw error;
    }
  }
}
