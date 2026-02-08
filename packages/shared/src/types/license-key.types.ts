/**
 * License key type definitions
 */

export enum KeyStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export interface LicenseKey {
  id: string;
  keyString: string;
  signature: string;
  productId: string;
  status: KeyStatus;
  purchaseId: string | null;
  activations: number;
  maxActivations: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLicenseKeyDto {
  keyString: string;
  signature: string;
  productId: string;
  maxActivations: number;
  expiresAt?: Date | null;
}

export interface UpdateLicenseKeyDto {
  status?: KeyStatus;
  activations?: number;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  metadata?: Record<string, any>;
}

export interface ValidateLicenseKeyDto {
  keyString: string;
  productId?: string;
}

export interface LicenseKeyValidationResponse {
  isValid: boolean;
  licenseKey?: LicenseKey;
  reason?: string;
  activationsRemaining?: number;
}

export interface LicenseKeyResponseDto extends LicenseKey {
  product?: {
    id: string;
    name: string;
  };
}
