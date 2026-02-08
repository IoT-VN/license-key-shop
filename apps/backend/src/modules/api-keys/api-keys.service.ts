import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate API key for user
   */
  async generateApiKey(userId: string, name: string, rateLimit?: number) {
    // Generate random key (32 bytes = 256 bits)
    const rawKey = randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    // Check user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Store hashed key
    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        name,
        rateLimit: rateLimit || 10000,
      },
    });

    this.logger.log(`Generated API key ${apiKey.id} for user ${userId}`);
    return {
      id: apiKey.id,
      key: rawKey,
      name: apiKey.name,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Validate API key by hash
   */
  async validateApiKey(keyHash: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey) {
      return null;
    }

    if (!apiKey.isActive || (apiKey.revokedAt && apiKey.revokedAt < new Date())) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    if (apiKey.revokedAt) {
      throw new ConflictException(`API key ${keyId} already revoked`);
    }

    const revoked = await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date(), isActive: false },
    });

    this.logger.log(`Revoked API key ${keyId}`);
    return revoked;
  }

  /**
   * List user's API keys
   */
  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        rateLimit: true,
        lastUsed: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  /**
   * Get API key usage stats
   */
  async getApiKeyStats(keyId: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    const totalValidations = await this.prisma.validationLog.count({
      where: { apiKeyId: keyId },
    });

    const successfulValidations = await this.prisma.validationLog.count({
      where: { apiKeyId: keyId, isValid: true },
    });

    const failedValidations = totalValidations - successfulValidations;

    return {
      apiKeyId: keyId,
      name: apiKey.name,
      totalValidations,
      successfulValidations,
      failedValidations,
      lastUsed: apiKey.lastUsed,
      rateLimit: apiKey.rateLimit,
    };
  }
}
