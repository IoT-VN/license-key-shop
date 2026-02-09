/**
 * Environment variable validation schema
 * Uses class-validator for runtime validation
 */

import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class EnvValidationSchema {
  // Application
  @IsString()
  NODE_ENV: string;

  @IsInt()
  @Min(1000)
  PORT: number;

  // Database
  @IsString()
  DATABASE_URL: string;

  // Redis (optional - for caching)
  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  // Clerk Authentication
  @IsString()
  CLERK_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  CLERK_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  CLERK_JWT_PUBLIC_KEY?: string;

  // SePay
  @IsString()
  @IsOptional()
  SEPAY_API_KEY?: string;

  @IsString()
  @IsOptional()
  SEPAY_API_URL?: string;

  @IsString()
  @IsOptional()
  SEPAY_BANK_ACCOUNT?: string;

  @IsString()
  @IsOptional()
  SEPAY_BANK_CODE?: string;

  @IsString()
  @IsOptional()
  SEPAY_QR_URL?: string;

  // CORS
  @IsString()
  FRONTEND_URL: string;

  // Key Generation
  @IsString()
  PRIVATE_KEY_PATH: string;

  @IsString()
  PUBLIC_KEY_PATH: string;

  @IsString()
  HMAC_SECRET_KEY: string;

  // Rate Limiting
  @IsInt()
  @Min(60)
  RATE_LIMIT_TTL: number;

  @IsInt()
  @Min(1)
  RATE_LIMIT_MAX: number;

  // Security
  @IsString()
  JWT_SECRET: string;

  @IsString()
  API_KEY_SALT: string;
}
