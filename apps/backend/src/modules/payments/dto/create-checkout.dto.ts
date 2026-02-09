import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export type CheckoutMode = "one_time" | "subscription";

/**
 * DTO for creating SePay checkout session
 * Note: Only one_time payments are supported for SePay
 */
export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(["one_time"])
  @IsOptional()
  mode?: "one_time"; // Only one-time payments supported

  @IsString()
  @IsOptional()
  customerEmail?: string;
}
