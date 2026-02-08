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

  // Redis
  @IsString()
  REDIS_URL: string;

  // Clerk Authentication
  @IsString()
  CLERK_SECRET_KEY: string;

  @IsString()
  CLERK_WEBHOOK_SECRET: string;

  @IsString()
  @IsOptional()
  CLERK_JWT_PUBLIC_KEY?: string;

  // Stripe
  @IsString()
  STRIPE_SECRET_KEY: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET: string;

  @IsString()
  @IsOptional()
  STRIPE_TAX_ID?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_ENDPOINT?: string;

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
