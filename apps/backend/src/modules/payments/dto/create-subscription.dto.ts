import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export type SubscriptionInterval = "month" | "year";

/**
 * DTO for creating subscription checkout
 */
export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(["month", "year"])
  @IsNotEmpty()
  interval: SubscriptionInterval;

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  metadata?: string; // JSON string
}
