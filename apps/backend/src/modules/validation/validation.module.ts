import { Module } from '@nestjs/common';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { RateLimitService } from './rate-limit.service';
import { DatabaseModule } from '../database/database.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { LicenseKeysModule } from '../license-keys/license-keys.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, ApiKeysModule, LicenseKeysModule, RedisModule],
  controllers: [ValidationController],
  providers: [ValidationService, RateLimitService],
  exports: [ValidationService, RateLimitService],
})
export class ValidationModule {}
