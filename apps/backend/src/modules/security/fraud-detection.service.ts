import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditLogService } from './audit-log.service';
import { FraudCheckResult } from './dto/security-event.dto';

interface FraudRule {
  name: string;
  check: (context: FraudContext) => Promise<boolean>;
  weight: number;
}

interface FraudContext {
  userId?: string;
  ipAddress: string;
  apiKeyId?: string;
  productId?: string;
  email?: string;
  userAgent?: string;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly rules: FraudRule[] = [
    {
      name: 'duplicate_purchase',
      check: this.checkDuplicatePurchase.bind(this),
      weight: 80,
    },
    {
      name: 'multiple_failed_payments',
      check: this.checkFailedPayments.bind(this),
      weight: 60,
    },
    {
      name: 'rapid_account_creation',
      check: this.checkRapidAccountCreation.bind(this),
      weight: 50,
    },
    {
      name: 'unusual_geolocation',
      check: this.checkUnusualGeolocation.bind(this),
      weight: 40,
    },
    {
      name: 'high_velocity_requests',
      check: this.checkHighVelocityRequests.bind(this),
      weight: 70,
    },
    {
      name: 'api_key_abuse',
      check: this.checkApiKeyAbuse.bind(this),
      weight: 90,
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Perform comprehensive fraud check
   */
  async checkFraud(context: FraudContext): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let totalScore = 0;

    for (const rule of this.rules) {
      try {
        const isTriggered = await rule.check(context);

        if (isTriggered) {
          totalScore += rule.weight;
          reasons.push(rule.name);
        }
      } catch (error) {
        this.logger.error(`Fraud rule "${rule.name}" failed: ${error.message}`);
      }
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, totalScore);
    const shouldBlock = normalizedScore >= 70;

    const result: FraudCheckResult = {
      isFraudulent: normalizedScore > 30,
      riskScore: normalizedScore,
      reasons,
      shouldBlock,
    };

    // Log high-risk events
    if (result.isFraudulent) {
      await this.audit.logFraudDetected(
        context.userId || 'unknown',
        context.ipAddress,
        normalizedScore,
        reasons,
      );
    }

    return result;
  }

  /**
   * Check for duplicate purchases
   */
  private async checkDuplicatePurchase(context: FraudContext): Promise<boolean> {
    if (!context.userId || !context.productId) {
      return false;
    }

    const recentPurchase = await this.prisma.purchase.findFirst({
      where: {
        userId: context.userId,
        productId: context.productId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Last 1 hour
        },
      },
    });

    if (recentPurchase) {
      await this.audit.logDuplicatePurchase(context.userId, context.productId, context.ipAddress);
      return true;
    }

    return false;
  }

  /**
   * Check for multiple failed payments
   */
  private async checkFailedPayments(context: FraudContext): Promise<boolean> {
    if (!context.userId) {
      return false;
    }

    const failedPayments = await this.prisma.purchase.count({
      where: {
        userId: context.userId,
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 86400000), // Last 24 hours
        },
      },
    });

    return failedPayments >= 3;
  }

  /**
   * Check for rapid account creation
   */
  private async checkRapidAccountCreation(context: FraudContext): Promise<boolean> {
    if (!context.ipAddress) {
      return false;
    }

    const recentAccounts = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Last 1 hour
        },
      },
    });

    // This is a simplified check - in production, you'd track IPs per account
    return recentAccounts > 10;
  }

  /**
   * Check for unusual geolocation changes
   */
  private async checkUnusualGeolocation(context: FraudContext): Promise<boolean> {
    if (!context.userId) {
      return false;
    }

    const recentPurchases = await this.prisma.purchase.findMany({
      where: {
        userId: context.userId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.now() - 86400000 * 7), // Last 7 days
        },
      },
      take: 5,
    });

    if (recentPurchases.length < 2) {
      return false;
    }

    // In production, you'd extract IPs from validation logs or metadata
    // For now, return false as this requires additional IP tracking
    return false;
  }

  /**
   * Check for high-velocity requests
   */
  private async checkHighVelocityRequests(context: FraudContext): Promise<boolean> {
    if (!context.userId) {
      return false;
    }

    // Check for multiple purchases in quick succession
    const recentPurchases = await this.prisma.purchase.count({
      where: {
        userId: context.userId,
        createdAt: {
          gte: new Date(Date.now() - 300000), // Last 5 minutes
        },
      },
    });

    return recentPurchases >= 3;
  }

  /**
   * Check for API key abuse
   */
  private async checkApiKeyAbuse(context: FraudContext): Promise<boolean> {
    if (!context.apiKeyId) {
      return false;
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: context.apiKeyId },
    });

    if (!apiKey || !apiKey.isActive) {
      return true;
    }

    // Check rate limit violations
    // In production, you'd track this in Redis
    return false;
  }

  /**
   * Check if email is suspicious
   */
  async isSuspiciousEmail(email: string): Promise<boolean> {
    const suspiciousPatterns = [
      /tempmail/,
      /guerrillamail/,
      /throwaway/,
      / disposable/,
      /@10minutemail/,
      /@tempomail/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Get fraud statistics for a user
   */
  async getUserFraudStats(userId: string) {
    const [purchases, failedPayments, securityEvents] = await Promise.all([
      this.prisma.purchase.count({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.purchase.count({
        where: { userId, status: 'FAILED' },
      }),
      this.prisma.securityEvent.count({
        where: { userId, type: 'FRAUD_DETECTED' },
      }),
    ]);

    return {
      totalPurchases: purchases,
      failedPayments,
      fraudEvents: securityEvents,
      riskLevel: this.calculateRiskLevel(purchases, failedPayments, securityEvents),
    };
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(purchases: number, failedPayments: number, fraudEvents: number): string {
    const failureRate = purchases > 0 ? failedPayments / purchases : 0;

    if (fraudEvents > 5 || failureRate > 0.5) {
      return 'HIGH';
    }

    if (fraudEvents > 2 || failureRate > 0.2) {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
