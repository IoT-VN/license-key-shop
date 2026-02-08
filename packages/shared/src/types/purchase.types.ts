/**
 * Purchase and transaction type definitions
 */

import { LicenseKey, KeyStatus } from './license-key.types';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  CHARGEBACK = 'CHARGEBACK',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  stripePaymentId: string | null;
  stripeInvoiceId: string | null;
  stripeSubscriptionId: string | null;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  licenseKey?: LicenseKey;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseDto {
  productId: string;
  amount: number;
  currency?: string;
  stripePaymentId?: string;
  stripeSubscriptionId?: string;
}

export interface UpdatePurchaseDto {
  status?: PurchaseStatus;
  stripePaymentId?: string;
  stripeInvoiceId?: string;
  metadata?: Record<string, any>;
}

export interface Transaction {
  id: string;
  purchaseId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  stripeTxId: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface Refund {
  id: string;
  purchaseId: string;
  amount: number;
  currency: string;
  stripeRefundId: string | null;
  reason: string | null;
  status: RefundStatus;
  metadata: Record<string, any> | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface CreateRefundDto {
  purchaseId: string;
  reason?: string;
}

export interface PurchaseResponseDto extends Omit<Purchase, 'licenseKey'> {
  product?: {
    id: string;
    name: string;
    price: number;
  };
  licenseKey?: {
    keyString: string;
    status: KeyStatus;
  };
}
