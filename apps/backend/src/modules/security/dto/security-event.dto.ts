import { EventType, Severity } from '@prisma/client';

export interface CreateSecurityEventDto {
  type: EventType;
  severity: Severity;
  ipAddress?: string;
  userId?: string;
  apiKeyId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface FraudCheckResult {
  isFraudulent: boolean;
  riskScore: number;
  reasons: string[];
  shouldBlock: boolean;
}

export interface IpReputationScore {
  score: number;
  isMalicious: boolean;
  isSuspicious: boolean;
  fraudScore: number;
  abuseConfidence: number;
  lastReported?: Date;
}

export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  burst?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}
