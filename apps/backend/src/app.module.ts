import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './common/config/config.module';
import { DatabaseModule } from './modules/database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ClerkModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LicenseKeysModule } from './modules/license-keys/license-keys.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ValidationModule } from './modules/validation/validation.module';
import { SecurityModule } from './modules/security/security.module';

@Module({
  imports: [
    // Configuration
    ConfigModule,

    // Custom config module
    AppConfigModule,

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per minute
    }]),

    // Core infrastructure
    DatabaseModule,
    RedisModule,
    HealthModule,
    MetricsModule,
    SecurityModule,

    // Authentication & Users
    ClerkModule,
    UsersModule,

    // License Keys
    LicenseKeysModule,

    // Payments & Invoices
    PaymentsModule,
    InvoicesModule,

    // Public API
    ApiKeysModule,
    ValidationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
