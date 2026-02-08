/**
 * Product-related type definitions
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  isActive: boolean;
  maxActivations: number;
  validityDays: number | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  stripePriceId: string | null;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  currency?: string;
  maxActivations?: number;
  validityDays?: number | null;
  metadata?: Record<string, any>;
  stripePriceId?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  isActive?: boolean;
  maxActivations?: number;
  validityDays?: number | null;
  metadata?: Record<string, any>;
  stripePriceId?: string;
}

export interface ProductResponseDto extends Product {
  // Add computed fields like available keys count
  availableKeys?: number;
}
