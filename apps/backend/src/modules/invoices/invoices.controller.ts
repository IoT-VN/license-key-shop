import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";

/**
 * Invoices controller
 * Handles invoice retrieval
 */
@Controller("invoices")
@UseGuards(ClerkAuthGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoices: InvoicesService) {}

  /**
   * Get invoice by purchase ID
   * GET /api/invoices/:purchaseId
   */
  @Get(":purchaseId")
  async getInvoice(@Param("purchaseId") purchaseId: string) {
    try {
      const invoice = await this.invoices.getInvoice(purchaseId);
      return {
        success: true,
        ...invoice,
      };
    } catch (error) {
      this.logger.error(`Get invoice failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's invoices
   * GET /api/invoices
   */
  @Get()
  async getUserInvoices(
    @Req() req: any,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20"
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: "Unauthorized" };
    }

    try {
      const result = await this.invoices.getUserInvoices(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`Get user invoices failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
