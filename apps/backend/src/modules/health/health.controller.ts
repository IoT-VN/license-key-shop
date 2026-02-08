/**
 * Health check controller
 * Provides health status for database, Redis, and API
 */

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async health() {
    const dbHealth = await this.getDatabaseHealth();
    const redisHealth = await this.redis.getHealthStatus();

    const overallStatus = dbHealth.status === 'up' && redisHealth.status === 'up' ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }

  @Get('db')
  async databaseHealth() {
    return this.getDatabaseHealth();
  }

  @Get('redis')
  async redisHealth() {
    return this.redis.getHealthStatus();
  }

  private async getDatabaseHealth() {
    try {
      // Execute a simple query to check connection
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
