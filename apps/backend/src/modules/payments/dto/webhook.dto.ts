import { IsString, IsNotEmpty } from "class-validator";

/**
 * DTO for Stripe webhook events
 */
export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  payload: string; // Raw request body as string

  @IsString()
  @IsNotEmpty()
  signature: string; // Stripe signature from headers
}
