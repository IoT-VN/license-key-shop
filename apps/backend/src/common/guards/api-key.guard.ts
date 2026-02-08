import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      throw new UnauthorizedException('API key required');
    }

    // Extract API key from "Bearer <key>" format
    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Invalid authorization format. Use: Bearer <api_key>');
    }

    const rawKey = parts[1];
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.apiKeysService.validateApiKey(keyHash);

    if (!apiKey) {
      this.logger.warn(`Failed API key authentication from ${request.ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach API key to request
    request.apiKey = apiKey;

    return true;
  }
}
