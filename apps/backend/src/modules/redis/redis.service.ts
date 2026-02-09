/**
 * Redis service wrapper
 * Manages Redis connection and provides caching operations
 * Falls back gracefully if Redis is not available
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisEnabled = true;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl || redisUrl === 'redis://localhost:6379') {
      this.logger.warn('Redis not configured - running without caching');
      super({ lazyConnect: true });
      this.redisEnabled = false;
      return;
    }

    super({
      host: redisUrl.replace('redis://', '').split(':')[0] || 'localhost',
      port: parseInt(redisUrl.split(':')[1] || '6379'),
      password: redisUrl.split('@')[0].includes(':')
        ? redisUrl.split(':')[2].split('@')[0]
        : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Event listeners
    this.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.on('error', (error) => {
      this.logger.warn('Redis connection error - running without caching', error.message);
      this.redisEnabled = false;
    });

    this.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleInit() {
    if (!this.redisEnabled) {
      this.logger.warn('Redis disabled - running without caching');
      return;
    }

    try {
      await this.ping();
      this.logger.log('Redis ping successful');
    } catch (error) {
      this.logger.warn('Failed to ping Redis - running without caching', error.message);
      this.redisEnabled = false;
    }
  }

  async onModuleDestroy() {
    if (this.redisEnabled) {
      await this.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  /**
   * Set cache with TTL
   */
  async setCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.redisEnabled) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.setex(key, ttlSeconds, serialized);
    } else {
      await this.set(key, serialized);
    }
  }

  /**
   * Get cached value
   */
  async getCache<T>(key: string): Promise<T | null> {
    if (!this.redisEnabled) return null;
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Delete cache
   */
  async deleteCache(key: string): Promise<void> {
    if (!this.redisEnabled) return;
    await this.del(key);
  }

  /**
   * Delete cache by pattern
   */
  async deleteCachePattern(pattern: string): Promise<void> {
    if (!this.redisEnabled) return;
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      await this.del(...keys);
    }
  }

  /**
   * Check if key exists
   */
  async keyExists(key: string): Promise<boolean> {
    if (!this.redisEnabled) return false;
    const result = await super.exists(key);
    return result === 1;
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incrementCounter(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.redisEnabled) return 0;
    const value = await this.incr(key);
    if (value === 1 && ttlSeconds) {
      await this.expire(key, ttlSeconds);
    }
    return value;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.ping();
      const latency = Date.now() - start;
      return {
        status: 'up',
        latency,
      };
    } catch {
      return {
        status: 'down',
        latency: -1,
      };
    }
  }
}
