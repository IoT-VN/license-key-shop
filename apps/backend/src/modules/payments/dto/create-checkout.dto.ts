import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export type CheckoutMode = "one_time" | "subscription";

/**
 * DTO for creating Stripe checkout session
 */
export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(["one_time", "subscription"])
  @IsOptional()
  mode?: CheckoutMode;

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
