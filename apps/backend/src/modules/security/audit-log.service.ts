import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventType, Severity } from '@prisma/client';
import { CreateSecurityEventDto } from './dto/security-event.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly eventQueue: CreateSecurityEventDto[] = [];
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.startBatchProcessing();
  }

  /**
   * Log security event asynchronously
   */
  async logEvent(dto: CreateSecurityEventDto): Promise<void> {
    try {
      this.eventQueue.push(dto);

      if (this.eventQueue.length >= this.BATCH_SIZE) {
        await this.flushEvents();
      }
    } catch (error) {
      this.logger.error(`Failed to queue security event: ${error.message}`);
    }
  }

  /**
   * Log rate limit exceeded event
   */
  async logRateLimitExceeded(ipAddress?: string, userId?: string, apiKeyId?: string): Promise<void> {
    await this.logEvent({
      type: EventType.RATE_LIMIT_EXCEEDED,
      severity: Severity.MEDIUM,
      ipAddress,
      userId,
      apiKeyId,
      description: 'Rate limit exceeded',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log IP blocked event
   */
  async logIpBlocked(ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      type: EventType.IP_BLOCKED,
      severity: Severity.HIGH,
      ipAddress,
      description: `IP blocked: ${reason}`,
      metadata: {
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log fraud detected event
   */
  async logFraudDetected(
    userId: string,
    ipAddress: string,
    riskScore: number,
    reasons: string[],
  ): Promise<void> {
    await this.logEvent({
      type: EventType.FRAUD_DETECTED,
      severity: riskScore > 70 ? Severity.CRITICAL : Severity.HIGH,
      ipAddress,
      userId,
      description: `Fraud detected (score: ${riskScore})`,
      metadata: {
        riskScore,
        reasons,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log duplicate purchase event
   */
  async logDuplicatePurchase(userId: string, productId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      type: EventType.DUPLICATE_PURCHASE,
      severity: Severity.MEDIUM,
      ipAddress,
      userId,
      description: 'Duplicate purchase attempted',
      metadata: {
        productId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log authentication failure event
   */
  async logAuthenticationFailed(ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      type: EventType.AUTHENTICATION_FAILED,
      severity: Severity.LOW,
      ipAddress,
      description: `Authentication failed: ${reason}`,
      metadata: {
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log API key abuse event
   */
  async logApiKeyAbuse(apiKeyId: string, ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      type: EventType.API_KEY_ABUSE,
      severity: Severity.HIGH,
      ipAddress,
      apiKeyId,
      description: `API key abuse: ${reason}`,
      metadata: {
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log suspicious activity event
   */
  async logSuspiciousActivity(
    ipAddress: string,
    userId?: string,
    description?: string,
  ): Promise<void> {
    await this.logEvent({
      type: EventType.SUSPICIOUS_ACTIVITY,
      severity: Severity.MEDIUM,
      ipAddress,
      userId,
      description: description || 'Suspicious activity detected',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Query security events with filters
   */
  async queryEvents(filters: {
    type?: EventType;
    severity?: Severity;
    ipAddress?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.severity) where.severity = filters.severity;
    if (filters.ipAddress) where.ipAddress = filters.ipAddress;
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return this.prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
    });
  }

  /**
   * Get security statistics
   */
  async getStats(timeRange: { startDate: Date; endDate: Date }) {
    const events = await this.prisma.securityEvent.findMany({
      where: {
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });

    const stats = {
      total: events.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      topIps: [] as { ipAddress: string; count: number }[],
    };

    for (const event of events) {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
      stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;
    }

    // Top IPs
    const ipCounts = events.reduce((acc, event) => {
      if (event.ipAddress) {
        acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    stats.topIps = Object.entries(ipCounts)
      .map(([ipAddress, count]) => ({ ipAddress, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Batch flush events to database
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0, this.BATCH_SIZE);

    try {
      await this.prisma.securityEvent.createMany({
        data: events,
        skipDuplicates: true,
      });

      this.logger.debug(`Flushed ${events.length} security events to database`);
    } catch (error) {
      this.logger.error(`Failed to flush security events: ${error.message}`);
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining events
    this.flushEvents();
  }
}
