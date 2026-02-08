import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateKeyDto {
  @ApiProperty({ example: 'ABCD-1234-EFGH-5678', description: 'License key string' })
  @IsString()
  @IsNotEmpty()
  licenseKey: string;

  @ApiProperty({ example: 'prod_abc123', description: 'Product ID', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    example: { version: '1.0.0', environment: 'production' },
    description: 'Additional metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ValidationResultDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: 'License key is valid', required: false })
  reason?: string;

  @ApiProperty({ example: 'ABCD-1234-EFGH-5678' })
  keyString: string;

  @ApiProperty({ example: 'prod_abc123', required: false })
  productId?: string;

  @ApiProperty({ example: 'My Product', required: false })
  productName?: string;

  @ApiProperty({ example: 3 })
  activationsRemaining: number;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', required: false })
  expiresAt?: Date;

  @ApiProperty({ example: '2026-02-07T10:30:00Z' })
  validatedAt: Date;

  @ApiProperty({ example: { features: ['premium', 'support'] }, required: false })
  features?: Record<string, any>;
}

export class RateLimitExceededDto {
  @ApiProperty({ example: false })
  allowed: boolean;

  @ApiProperty({ example: 0 })
  remaining: number;

  @ApiProperty({ example: '2026-02-07T11:00:00Z' })
  resetAt: Date;

  @ApiProperty({ example: 'Rate limit exceeded. Try again later.' })
  message: string;
}
