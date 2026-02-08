import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

/**
 * DTO for processing refund
 */
export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  purchaseId: string;

  @IsNumber()
  @IsOptional()
  amount?: number; // If not provided, full refund

  @IsString()
  @IsOptional()
  reason?: string;
}
