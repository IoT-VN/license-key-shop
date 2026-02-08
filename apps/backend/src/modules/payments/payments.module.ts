import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { StripeService } from "./stripe.service";
import { WebhooksController } from "./webhooks.controller";
import { DatabaseModule } from "../database/database.module";
import { ClerkModule } from "../auth/auth.module";

/**
 * Payments module
 * Handles Stripe payment integration, webhooks, and refunds
 */
@Module({
  imports: [ConfigModule, DatabaseModule, ClerkModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
