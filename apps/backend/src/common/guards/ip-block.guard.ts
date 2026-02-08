import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { IpReputationService } from '../../modules/security/ip-reputation.service';
import { RateLimitService } from '../../modules/security/rate-limit.service';

@Injectable()
export class IpBlockGuard implements CanActivate {
  private readonly logger = new Logger(IpBlockGuard.name);

  constructor(
    private readonly ipReputation: IpReputationService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = this.ipReputation.extractIpFromRequest(request);

    try {
      // Check if IP is whitelisted
      const isWhitelisted = await this.ipReputation.isIpWhitelisted(ipAddress);
      if (isWhitelisted) {
        return true;
      }

      // Check if IP is manually blocked
      const isBlocked = await this.ipReputation.isIpBlocked(ipAddress);
      if (isBlocked) {
        throw new ForbiddenException('IP address is blocked');
      }

      // Check if IP is rate limited
      const rateLimited = await this.rateLimit.isIpBlocked(ipAddress);
      if (rateLimited) {
        throw new ForbiddenException('Too many requests from this IP');
      }

      // Check IP reputation
      const shouldBlock = await this.ipReputation.shouldBlockIp(ipAddress);
      if (shouldBlock) {
        throw new ForbiddenException('IP address has poor reputation');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`IP block guard error: ${error.message}`);
      // Fail open - allow request if guard fails
      return true;
    }
  }
}
