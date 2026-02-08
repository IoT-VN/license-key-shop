import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AuditLogService } from './audit-log.service';
import { RateLimitConfig, RateLimitResult } from './dto/security-event.dto';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Default rate limit configurations
  private readonly defaultLimits: Record<string, RateLimitConfig> = {
    global: { limit: 1000, window: 3600 }, // 1000 requests/hour globally
    validation: { limit: 1000, window: 3600 }, // 1000 requests/hour per IP
    purchase: { limit: 10, window: 3600 }, // 10 purchases/hour
    auth: { limit: 20, window: 3600 }, // 20 auth attempts/hour
    api_key: { limit: 10000, window: 3600 }, // 10000 requests/hour per API key
  };

  constructor(
    private readonly redis: RedisService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Check rate limit using token bucket algorithm
   */
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig,
    context?: { ipAddress?: string; userId?: string; apiKeyId?: string },
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const maxTokens = config.limit;
    const refillRate = config.limit / config.window; // Tokens per second

    try {
      const bucket = await this.getBucket(key);

      const now = Date.now();
      let tokens: number;
      let lastRefill: number;

      if (!bucket) {
        // First request
        tokens = maxTokens - 1;
        lastRefill = now;

        await this.setBucket(key, { tokens, lastRefill }, config.window);
        await this.redis.expire(key, config.window);

        return {
          allowed: true,
          remaining: Math.floor(tokens),
          resetAt: new Date(now + config.window * 1000),
          limit: maxTokens,
        };
      }

      // Refill tokens based on elapsed time
      tokens = bucket.tokens;
      lastRefill = bucket.lastRefill;
      const elapsed = (now - lastRefill) / 1000;
      const newTokens = Math.min(maxTokens, tokens + elapsed * refillRate);

      if (newTokens >= 1) {
        // Allow request
        tokens = newTokens - 1;
        await this.setBucket(key, { tokens, lastRefill: now }, config.window);

        return {
          allowed: true,
          remaining: Math.floor(tokens),
          resetAt: new Date(now + config.window * 1000),
          limit: maxTokens,
        };
      }

      // Rate limit exceeded
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(lastRefill + config.window * 1000),
        limit: maxTokens,
      };

      // Log rate limit violation
      if (context) {
        await this.audit.logRateLimitExceeded(
          context.ipAddress,
          context.userId,
          context.apiKeyId,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.limit,
        resetAt: new Date(Date.now() + config.window * 1000),
        limit: maxTokens,
      };
    }
  }

  /**
   * Check IP-based rate limit
   */
  async checkIpRateLimit(
    ipAddress: string,
    endpoint: string = 'global',
  ): Promise<RateLimitResult> {
    const config = this.defaultLimits[endpoint] || this.defaultLimits.global;
    const identifier = `ip:${ipAddress}:${endpoint}`;

    return this.checkRateLimit(identifier, config, { ipAddress });
  }

  /**
   * Check user-based rate limit
   */
  async checkUserRateLimit(
    userId: string,
    endpoint: string = 'global',
  ): Promise<RateLimitResult> {
    const config = this.defaultLimits[endpoint] || this.defaultLimits.global;
    const identifier = `user:${userId}:${endpoint}`;

    return this.checkRateLimit(identifier, config);
  }

  /**
   * Check API key rate limit
   */
  async checkApiKeyRateLimit(apiKeyId: string, limit?: number): Promise<RateLimitResult> {
    const config = {
      limit: limit || this.defaultLimits.api_key.limit,
      window: this.defaultLimits.api_key.window,
    };
    const identifier = `apikey:${apiKeyId}`;

    return this.checkRateLimit(identifier, config, { apiKeyId });
  }

  /**
   * Check global rate limit
   */
  async checkGlobalRateLimit(): Promise<RateLimitResult> {
    const config = this.defaultLimits.global;
    const identifier = 'global:all';

    return this.checkRateLimit(identifier, config);
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(identifier: string): Promise<{ remaining: number; resetAt: Date }> {
    const key = `rate_limit:${identifier}`;
    const bucket = await this.getBucket(key);

    if (!bucket) {
      return {
        remaining: this.defaultLimits.global.limit,
        resetAt: new Date(Date.now() + this.defaultLimits.global.window * 1000),
      };
    }

    return {
      remaining: Math.floor(bucket.tokens),
      resetAt: new Date(bucket.lastRefill + this.defaultLimits.global.window * 1000),
    };
  }

  /**
   * Reset rate limit bucket (admin only)
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await this.redis.del(key);
    this.logger.log(`Rate limit reset for: ${identifier}`);
  }

  /**
   * Block IP temporarily
   */
  async blockIp(ipAddress: string, duration: number = 3600): Promise<void> {
    const key = `ip_blocked:${ipAddress}`;
    await this.redis.set(key, '1', 'EX', duration);
    this.logger.warn(`IP blocked temporarily: ${ipAddress} for ${duration}s`);
  }

  /**
   * Check if IP is blocked
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const key = `ip_blocked:${ipAddress}`;
    return !!(await this.redis.get(key));
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalLimited: number;
    topLimitedIps: Array<{ ip: string; count: number }>;
  }> {
    // This would require tracking rate limit hits in a separate counter
    // For now, return basic structure
    return {
      totalLimited: 0,
      topLimitedIps: [],
    };
  }

  /**
   * Get bucket from Redis
   */
  private async getBucket(key: string): Promise<RateLimitBucket | null> {
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      tokens: parseFloat(data.tokens || '0'),
      lastRefill: parseFloat(data.lastRefill || '0'),
    };
  }

  /**
   * Set bucket in Redis
   */
  private async setBucket(key: string, bucket: RateLimitBucket, ttl: number): Promise<void> {
    await this.redis.hmset(key, {
      tokens: bucket.tokens.toString(),
      lastRefill: bucket.lastRefill.toString(),
    });
    await this.redis.expire(key, ttl);
  }
}
