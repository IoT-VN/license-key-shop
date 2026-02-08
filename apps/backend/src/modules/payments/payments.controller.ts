import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";

/**
 * Payments controller
 * Handles checkout and payment operations
 */
@Controller("payments")
@UseGuards(ClerkAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly payments: PaymentsService) {}

  /**
   * Create checkout session
   * POST /api/payments/create-checkout
   */
  @Post("create-checkout")
  async createCheckout(@Req() req: any, @Body() dto: CreateCheckoutDto) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: "Unauthorized" };
    }

    try {
      const result = await this.payments.createCheckout(userId, {
        productId: dto.productId,
        mode: dto.mode || "one_time",
        customerEmail: dto.customerEmail,
      });

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`Create checkout failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create subscription checkout
   * POST /api/payments/create-subscription
   */
  @Post("create-subscription")
  async createSubscription(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: "Unauthorized" };
    }

    try {
      const result = await this.payments.createCheckout(userId, {
        productId: dto.productId,
        mode: "subscription",
        interval: dto.interval,
        customerEmail: dto.customerEmail,
      });

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`Create subscription failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get checkout session status
   * GET /api/payments/session/:sessionId
   */
  @Get("session/:sessionId")
  async getSessionStatus(@Param("sessionId") sessionId: string) {
    try {
      const status = await this.payments.getSessionStatus(sessionId);
      return {
        success: true,
        ...status,
      };
    } catch (error: any) {
      this.logger.error(`Get session failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process refund (admin only)
   * POST /api/payments/refund
   */
  @Post("refund")
  async processRefund(@Req() req: any, @Body() dto: CreateRefundDto) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: "Unauthorized" };
    }

    // TODO: Check if user is admin
    // For now, allow all authenticated users

    try {
      const refund = await this.payments.processRefund(
        dto.purchaseId,
        dto.amount,
        dto.reason
      );

      return {
        success: true,
        refund,
      };
    } catch (error: any) {
      this.logger.error(`Refund failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
