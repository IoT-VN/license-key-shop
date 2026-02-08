import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { AuditLogService } from './audit-log.service';
import { IpReputationScore } from './dto/security-event.dto';

@Injectable()
export class IpReputationService {
  private readonly logger = new Logger(IpReputationService.name);
  private readonly cacheTTL = 86400; // 24 hours
  private readonly abuseIpdbKey: string;
  private readonly enableIpReputation: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly audit: AuditLogService,
  ) {
    this.abuseIpdbKey = this.config.get<string>('ABUSEIPDB_API_KEY') || '';
    this.enableIpReputation = this.config.get<string>('ENABLE_IP_REPUTATION') === 'true';
  }

  /**
   * Check IP reputation score
   */
  async checkReputation(ipAddress: string): Promise<IpReputationScore> {
    try {
      // Check cache first
      const cached = await this.getCachedScore(ipAddress);
      if (cached) {
        this.logger.debug(`Cache hit for IP: ${ipAddress}`);
        return cached;
      }

      // Default score if IP reputation disabled
      if (!this.enableIpReputation || !this.abuseIpdbKey) {
        return this.getDefaultScore();
      }

      // Fetch from AbuseIPDB API
      const score = await this.fetchFromAbuseIpdb(ipAddress);

      // Cache the result
      await this.cacheScore(ipAddress, score);

      return score;
    } catch (error) {
      this.logger.error(`Failed to check IP reputation: ${error.message}`);
      // Fail open - return default score
      return this.getDefaultScore();
    }
  }

  /**
   * Check if IP should be blocked
   */
  async shouldBlockIp(ipAddress: string): Promise<boolean> {
    const score = await this.checkReputation(ipAddress);

    // Block if score is high (malicious)
    if (score.isMalicious) {
      await this.audit.logIpBlocked(ipAddress, `High abuse score: ${score.abuseConfidence}%`);
      return true;
    }

    return false;
  }

  /**
   * Manually block IP address
   */
  async blockIp(ipAddress: string, reason: string, duration?: number): Promise<void> {
    const key = `ip_blocked:${ipAddress}`;
    const ttl = duration || 86400; // Default 24 hours

    await this.redis.set(key, JSON.stringify({ reason, blockedAt: Date.now() }), 'EX', ttl);

    await this.audit.logIpBlocked(ipAddress, reason);
    this.logger.warn(`IP blocked: ${ipAddress} - ${reason}`);
  }

  /**
   * Check if IP is manually blocked
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const key = `ip_blocked:${ipAddress}`;
    const blocked = await this.redis.get(key);
    return !!blocked;
  }

  /**
   * Unblock IP address
   */
  async unblockIp(ipAddress: string): Promise<void> {
    const key = `ip_blocked:${ipAddress}`;
    await this.redis.del(key);
    this.logger.log(`IP unblocked: ${ipAddress}`);
  }

  /**
   * Add IP to whitelist
   */
  async whitelistIp(ipAddress: string): Promise<void> {
    const key = `ip_whitelisted:${ipAddress}`;
    await this.redis.set(key, '1', 'EX', 86400 * 7); // 7 days
    this.logger.log(`IP whitelisted: ${ipAddress}`);
  }

  /**
   * Check if IP is whitelisted
   */
  async isIpWhitelisted(ipAddress: string): Promise<boolean> {
    const key = `ip_whitelisted:${ipAddress}`;
    const whitelisted = await this.redis.get(key);
    return !!whitelisted;
  }

  /**
   * Get cached reputation score
   */
  private async getCachedScore(ipAddress: string): Promise<IpReputationScore | null> {
    const key = `ip_reputation:${ipAddress}`;
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached) as IpReputationScore;
    } catch {
      return null;
    }
  }

  /**
   * Cache reputation score
   */
  private async cacheScore(ipAddress: string, score: IpReputationScore): Promise<void> {
    const key = `ip_reputation:${ipAddress}`;
    await this.redis.set(key, JSON.stringify(score), 'EX', this.cacheTTL);
  }

  /**
   * Fetch score from AbuseIPDB API
   */
  private async fetchFromAbuseIpdb(ipAddress: string): Promise<IpReputationScore> {
    const url = 'https://api.abuseipdb.com/api/v2/check';
    const headers = {
      'Key': this.abuseIpdbKey,
      'Accept': 'application/json',
    };
    const params = new URLSearchParams({
      ipAddress,
      maxAge: '90',
      verbose: '',
    });

    try {
      const response = await fetch(`${url}?${params}`, { headers });

      if (!response.ok) {
        throw new Error(`AbuseIPDB API error: ${response.status}`);
      }

      const data = await response.json();

      const abuseConfidence = data.data.abuseConfidenceScore || 0;
      const totalReports = data.data.totalReports || 0;
      const isMalicious = abuseConfidence >= 70;
      const isSuspicious = abuseConfidence >= 30 && abuseConfidence < 70;

      return {
        score: abuseConfidence,
        isMalicious,
        isSuspicious,
        fraudScore: this.calculateFraudScore(abuseConfidence, totalReports),
        abuseConfidence,
        lastReported: data.data.lastReportedAt ? new Date(data.data.lastReportedAt) : undefined,
      };
    } catch (error) {
      this.logger.error(`AbuseIPDB fetch failed: ${error.message}`);
      return this.getDefaultScore();
    }
  }

  /**
   * Calculate fraud score based on multiple factors
   */
  private calculateFraudScore(abuseConfidence: number, totalReports: number): number {
    // Weight the abuse confidence and number of reports
    const confidenceWeight = 0.7;
    const reportsWeight = 0.3;

    // Normalize reports (0-100 scale, capped at 100 reports)
    const normalizedReports = Math.min(100, totalReports);

    return Math.round(
      abuseConfidence * confidenceWeight + normalizedReports * reportsWeight
    );
  }

  /**
   * Get default reputation score
   */
  private getDefaultScore(): IpReputationScore {
    return {
      score: 0,
      isMalicious: false,
      isSuspicious: false,
      fraudScore: 0,
      abuseConfidence: 0,
    };
  }

  /**
   * Extract IP address from request
   */
  extractIpFromRequest(req: any): string {
    // Check various headers for IP
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}
