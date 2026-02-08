import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogService } from './audit-log.service';
import { IpReputationService } from './ip-reputation.service';
import { FraudDetectionService } from './fraud-detection.service';
import { RateLimitService } from './rate-limit.service';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule],
  providers: [
    AuditLogService,
    IpReputationService,
    FraudDetectionService,
    RateLimitService,
  ],
  exports: [
    AuditLogService,
    IpReputationService,
    FraudDetectionService,
    RateLimitService,
  ],
})
export class SecurityModule {}
