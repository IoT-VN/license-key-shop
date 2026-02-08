import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for license key validation request
 */
export class ValidateKeyDto {
  @IsString()
  @IsNotEmpty()
  keyString: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for validation response
 */
export class ValidationResult {
  isValid: boolean;
  keyString: string;
  productId?: string;
  productName?: string;
  status: string;
  reason?: string;
  activationsRemaining?: number;
  expiresAt?: Date | null;
  features?: string[];
  metadata?: Record<string, any>;
  validatedAt: Date;
}

/**
 * DTO for validation error details
 */
export class ValidationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
