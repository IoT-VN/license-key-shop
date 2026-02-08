import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';

export enum GenerateKeyStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * DTO for generating a single license key
 */
export class GenerateKeyDto {
  @IsString()
  @IsNotEmpty()
  productId: string;
}

/**
 * DTO for batch generating license keys
 */
export class GenerateKeysDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  count: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  validityDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxActivations?: number;
}

/**
 * DTO for key generation response
 */
export class KeyGenerationResponse {
  keyString: string;
  productId: string;
  status: string;
  createdAt: Date;
}

/**
 * DTO for batch generation status
 */
export class BatchGenerationStatus {
  id: string;
  productId: string;
  total: number;
  generated: number;
  status: GenerateKeyStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
