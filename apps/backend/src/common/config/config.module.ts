/**
 * Configuration module with environment variable validation
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvValidationSchema } from './env-validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available everywhere
      envFilePath: ['.env.local', '.env'],
      validationSchema: EnvValidationSchema,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
