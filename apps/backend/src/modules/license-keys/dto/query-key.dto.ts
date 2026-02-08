import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyStatus } from '@prisma/client';

/**
 * DTO for querying license keys
 */
export class QueryKeysDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsEnum(KeyStatus)
  status?: KeyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * DTO for paginated key list response
 */
export class PaginatedKeysResponse {
  data: Array<{
    id: string;
    keyString: string;
    productId: string;
    status: KeyStatus;
    activations: number;
    maxActivations: number;
    expiresAt?: Date;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
