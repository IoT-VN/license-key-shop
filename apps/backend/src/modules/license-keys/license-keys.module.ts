import { Module } from '@nestjs/common';
import { LicenseKeysController } from './license-keys.controller';
import { LicenseKeysService } from './license-keys.service';
import { CryptoService } from './crypto.service';
import { KeyGeneratorService } from './key-generator.service';
import { PrismaService } from '../database/prisma.service';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * License keys module
 * Handles license key generation, validation, and management
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 600, // 600 requests per minute
    }]),
  ],
  controllers: [LicenseKeysController],
  providers: [
    LicenseKeysService,
    CryptoService,
    KeyGeneratorService,
    PrismaService,
  ],
  exports: [LicenseKeysService],
})
export class LicenseKeysModule {}
