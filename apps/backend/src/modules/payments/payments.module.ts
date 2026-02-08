import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { SePayService } from "./sepay.service";
import { WebhooksController } from "./webhooks.controller";
import { DatabaseModule } from "../database/database.module";
import { ClerkModule } from "../auth/auth.module";

/**
 * Payments module
 * Handles SePay payment integration, webhooks, and refunds
 */
@Module({
  imports: [ConfigModule, DatabaseModule, ClerkModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, SePayService],
  exports: [PaymentsService, SePayService],
})
export class PaymentsModule {}
