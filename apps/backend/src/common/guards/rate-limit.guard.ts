import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RateLimitService } from '../../modules/security/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const ipAddress =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip ||
      'unknown';

    const userId = request.user?.id;
    const apiKeyId = request.apiKey?.id;

    try {
      // Check global rate limit
      const globalResult = await this.rateLimit.checkGlobalRateLimit();
      if (!globalResult.allowed) {
        this.setRateLimitHeaders(response, globalResult);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded',
            limit: globalResult.limit,
            remaining: globalResult.remaining,
            resetAt: globalResult.resetAt,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check IP rate limit
      const endpoint = this.getEndpointType(request);
      const ipResult = await this.rateLimit.checkIpRateLimit(ipAddress, endpoint);

      this.setRateLimitHeaders(response, ipResult);

      if (!ipResult.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded for this IP',
            limit: ipResult.limit,
            remaining: ipResult.remaining,
            resetAt: ipResult.resetAt,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check user rate limit if authenticated
      if (userId) {
        const userResult = await this.rateLimit.checkUserRateLimit(userId, endpoint);

        if (!userResult.allowed) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Rate limit exceeded for this user',
              limit: userResult.limit,
              remaining: userResult.remaining,
              resetAt: userResult.resetAt,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Check API key rate limit if using API key
      if (apiKeyId) {
        const apiKeyResult = await this.rateLimit.checkApiKeyRateLimit(apiKeyId);

        if (!apiKeyResult.allowed) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'API key rate limit exceeded',
              limit: apiKeyResult.limit,
              remaining: apiKeyResult.remaining,
              resetAt: apiKeyResult.resetAt,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Rate limit guard error: ${error.message}`);
      // Fail open - allow request if guard fails
      return true;
    }
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(
    response: any,
    result: { limit: number; remaining: number; resetAt: Date },
  ): void {
    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000));
  }

  /**
   * Determine endpoint type based on route
   */
  private getEndpointType(request: any): string {
    const path = request.route?.path || request.path;

    if (path.includes('/validate') || path.includes('/validation')) {
      return 'validation';
    }

    if (path.includes('/purchase') || path.includes('/payment') || path.includes('/checkout')) {
      return 'purchase';
    }

    if (path.includes('/auth')) {
      return 'auth';
    }

    return 'global';
  }
}
