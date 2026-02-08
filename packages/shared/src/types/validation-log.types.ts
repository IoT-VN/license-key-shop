/**
 * Validation log type definitions
 */

export interface ValidationLog {
  id: string;
  licenseKeyId: string;
  apiKeyId: string | null;
  isValid: boolean;
  validationReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateValidationLogDto {
  licenseKeyId: string;
  apiKeyId?: string;
  isValid: boolean;
  validationReason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ValidationLogResponseDto extends ValidationLog {
  licenseKey: {
    keyString: string;
    productId: string;
  };
}
