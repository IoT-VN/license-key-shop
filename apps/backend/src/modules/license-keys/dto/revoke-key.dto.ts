import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum RevocationReason {
  FRAUD = 'fraud',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  TERMS_VIOLATION = 'terms_violation',
  PAYMENT_ISSUE = 'payment_issue',
  MANUAL = 'manual',
  OTHER = 'other',
}

/**
 * DTO for revoking a license key
 */
export class RevokeKeyDto {
  @IsString()
  @IsNotEmpty()
  keyString: string;

  @IsEnum(RevocationReason)
  reason: RevocationReason;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for revocation response
 */
export class RevocationResponse {
  keyString: string;
  status: string;
  revokedAt: Date;
  reason: string;
  notes?: string;
}
