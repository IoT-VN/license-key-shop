import { Injectable, Logger } from '@nestjs/common';
import { LicenseKeysService } from '../license-keys/license-keys.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    private readonly licenseKeysService: LicenseKeysService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Validate license key with caching
   */
  async validateKey(
    keyString: string,
    apiKeyId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    // Check cache first
    const cacheKey = `validation:${keyString}`;
    const cached = await this.redis.getCache<any>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for key ${keyString}`);
      return cached;
    }

    // Validate key
    const result = await this.licenseKeysService.validateKey(keyString, metadata);

    // Find license key ID for logging
    const licenseKey = await this.prisma.licenseKey.findUnique({
      where: { keyString },
      select: { id: true },
    });

    // Log validation with API key
    if (licenseKey) {
      await this.prisma.validationLog.create({
        data: {
          licenseKeyId: licenseKey.id,
          apiKeyId,
          isValid: result.isValid,
          validationReason: result.reason || result.status,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          metadata: result as any,
        },
      });
    }

    // Cache result for 5 minutes
    await this.redis.setCache(cacheKey, result, 300);

    return result;
  }

  /**
   * Invalidate validation cache
   */
  async invalidateCache(keyString: string): Promise<void> {
    const cacheKey = `validation:${keyString}`;
    await this.redis.deleteCache(cacheKey);
  }

  /**
   * Get validation stats
   */
  async getValidationStats(apiKeyId: string, timeRange?: { from: Date; to: Date }) {
    const where: any = { apiKeyId };

    if (timeRange) {
      where.createdAt = {
        gte: timeRange.from,
        lte: timeRange.to,
      };
    }

    const [total, successful, failed, recent] = await Promise.all([
      this.prisma.validationLog.count({ where }),
      this.prisma.validationLog.count({ where: { ...where, isValid: true } }),
      this.prisma.validationLog.count({ where: { ...where, isValid: false } }),
      this.prisma.validationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          licenseKey: {
            select: {
              keyString: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      recentValidations: recent,
    };
  }
}
