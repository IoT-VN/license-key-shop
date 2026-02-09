import { IsString, IsNotEmpty } from "class-validator";

/**
 * DTO for SePay webhook events
 */
export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  payload: string; // Raw request body as string

  @IsString()
  @IsNotEmpty()
  authorization: string; // SePay API key from headers
}
