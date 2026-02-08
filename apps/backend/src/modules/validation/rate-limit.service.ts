import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Check rate limit using token bucket algorithm
   */
  async checkRateLimit(apiKeyId: string, limit: number): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `rate_limit:${apiKeyId}`;
    const maxTokens = limit;
    const refillRate = limit / 3600; // Tokens per second

    try {
      const bucket = await this.redis.hgetall(key);

      let tokens: number;
      let lastRefill: number;

      if (!bucket || Object.keys(bucket).length === 0) {
        // First request
        tokens = maxTokens - 1;
        lastRefill = Date.now();

        await this.redis.hmset(key, {
          tokens: tokens.toString(),
          lastRefill: lastRefill.toString(),
        });
        await this.redis.expire(key, 3600);

        return {
          allowed: true,
          remaining: tokens,
          resetAt: new Date(lastRefill + 3600000),
        };
      }

      // Refill tokens based on elapsed time
      tokens = parseFloat(bucket.tokens || '0');
      lastRefill = parseFloat(bucket.lastRefill || Date.now().toString());
      const now = Date.now();
      const elapsed = (now - lastRefill) / 1000;
      const newTokens = Math.min(maxTokens, tokens + elapsed * refillRate);

      if (newTokens >= 1) {
        // Allow request
        tokens = newTokens - 1;
        await this.redis.hmset(key, {
          tokens: tokens.toString(),
          lastRefill: now.toString(),
        });

        return {
          allowed: true,
          remaining: Math.floor(tokens),
          resetAt: new Date(now + 3600000),
        };
      }

      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(lastRefill + 3600000),
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + 3600000),
      };
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(apiKeyId: string): Promise<{ remaining: number; resetAt: Date }> {
    const key = `rate_limit:${apiKeyId}`;
    const bucket = await this.redis.hgetall(key);

    if (!bucket || Object.keys(bucket).length === 0) {
      return {
        remaining: 10000,
        resetAt: new Date(Date.now() + 3600000),
      };
    }

    const tokens = parseFloat(bucket.tokens || '0');
    const lastRefill = parseFloat(bucket.lastRefill || Date.now().toString());

    return {
      remaining: Math.floor(tokens),
      resetAt: new Date(lastRefill + 3600000),
    };
  }

  /**
   * Reset rate limit bucket
   */
  async resetRateLimit(apiKeyId: string): Promise<void> {
    const key = `rate_limit:${apiKeyId}`;
    await this.redis.del(key);
  }
}
