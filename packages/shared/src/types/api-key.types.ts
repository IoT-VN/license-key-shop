/**
 * API key type definitions
 */

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  name: string;
  lastUsed: Date | null;
  isActive: boolean;
  rateLimit: number;
  metadata: Record<string, any> | null;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export interface CreateApiKeyDto {
  name: string;
  rateLimit?: number;
  expiresAt?: Date | null;
}

export interface UpdateApiKeyDto {
  name?: string;
  isActive?: boolean;
  rateLimit?: number;
  expiresAt?: Date | null;
}

export interface ApiKeyResponseDto extends Omit<ApiKey, 'keyHash'> {
  // Expose only safe fields
  apiKeyPreview: string; // First 8 chars only
}
