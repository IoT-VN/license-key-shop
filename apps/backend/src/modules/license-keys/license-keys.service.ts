import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from './crypto.service';
import { KeyGeneratorService } from './key-generator.service';
import { KeyStatus } from '@prisma/client';
import { addDays } from 'date-fns';

/**
 * License keys service
 * Handles CRUD operations, validation, and revocation
 */
@Injectable()
export class LicenseKeysService {
  private readonly logger = new Logger(LicenseKeysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly keyGenerator: KeyGeneratorService,
  ) {}

  /**
   * Generate a single license key
   */
  async generateKey(productId: string, options?: { validityDays?: number; maxActivations?: number }) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // Generate key
    const { keyString, signature } = this.keyGenerator.generateKey(productId);

    // Calculate expiry
    const validityDays = options?.validityDays ?? product.validityDays;
    const expiresAt = validityDays ? addDays(new Date(), validityDays) : null;

    // Save to database
    const licenseKey = await this.prisma.licenseKey.create({
      data: {
        keyString,
        signature,
        productId,
        status: KeyStatus.AVAILABLE,
        maxActivations: options?.maxActivations ?? product.maxActivations,
        expiresAt,
      },
      include: {
        product: true,
      },
    });

    this.logger.log(`Generated key ${keyString} for product ${productId}`);
    return licenseKey;
  }

  /**
   * Generate multiple license keys
   */
  async generateKeys(
    productId: string,
    count: number,
    options?: { validityDays?: number; maxActivations?: number },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const validityDays = options?.validityDays ?? product.validityDays;
    const maxActivations = options?.maxActivations ?? product.maxActivations;
    const expiresAt = validityDays ? addDays(new Date(), validityDays) : null;

    // Generate keys
    const keys = this.keyGenerator.generateKeys(productId, count);

    // Batch insert
    const created = await this.prisma.licenseKey.createMany({
      data: keys.map((key) => ({
        keyString: key.keyString,
        signature: key.signature,
        productId,
        status: KeyStatus.AVAILABLE,
        maxActivations,
        expiresAt,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Generated ${created.count} keys for product ${productId}`);
    return { count: created.count, productId };
  }

  /**
   * Validate a license key
   */
  async validateKey(keyString: string, metadata?: { ipAddress?: string; userAgent?: string }) {
    // Check format first
    if (!this.keyGenerator.isValidFormat(keyString)) {
      return {
        isValid: false,
        keyString,
        status: 'INVALID_FORMAT',
        reason: 'Invalid key format',
        validatedAt: new Date(),
      };
    }

    // Find key in database
    const licenseKey = await this.prisma.licenseKey.findUnique({
      where: { keyString },
      include: {
        product: true,
      },
    });

    if (!licenseKey) {
      return {
        isValid: false,
        keyString,
        status: 'NOT_FOUND',
        reason: 'Key not found',
        validatedAt: new Date(),
      };
    }

    // Verify cryptographic signature
    const signatureValid = this.cryptoService.verifyCombined(keyString, licenseKey.signature);
    if (!signatureValid) {
      this.logger.warn(`Invalid signature for key ${keyString}`);
      return {
        isValid: false,
        keyString,
        status: 'INVALID',
        reason: 'Invalid signature',
        validatedAt: new Date(),
      };
    }

    // Check status
    if (licenseKey.status === KeyStatus.REVOKED) {
      return {
        isValid: false,
        keyString,
        status: 'REVOKED',
        reason: licenseKey.revokedReason || 'Key revoked',
        validatedAt: new Date(),
      };
    }

    if (licenseKey.status === KeyStatus.EXPIRED) {
      return {
        isValid: false,
        keyString,
        status: 'EXPIRED',
        reason: 'Key expired',
        expiresAt: licenseKey.expiresAt,
        validatedAt: new Date(),
      };
    }

    // Check expiry
    if (licenseKey.expiresAt && licenseKey.expiresAt < new Date()) {
      // Update status to expired
      await this.prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: { status: KeyStatus.EXPIRED },
      });

      return {
        isValid: false,
        keyString,
        status: 'EXPIRED',
        reason: 'Key expired',
        expiresAt: licenseKey.expiresAt || undefined,
        validatedAt: new Date(),
      };
    }

    // Check activation limit
    const activationsRemaining = licenseKey.maxActivations - licenseKey.activations;
    if (activationsRemaining <= 0) {
      return {
        isValid: false,
        keyString,
        status: 'MAX_ACTIVATIONS_REACHED',
        reason: 'Maximum activations reached',
        activationsRemaining: 0,
        validatedAt: new Date(),
      };
    }

    // Log validation
    await this.prisma.validationLog.create({
      data: {
        licenseKeyId: licenseKey.id,
        isValid: true,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    // Return valid result
    return {
      isValid: true,
      keyString,
      productId: licenseKey.productId,
      productName: licenseKey.product.name,
      status: licenseKey.status,
      activationsRemaining,
      expiresAt: licenseKey.expiresAt,
      features: licenseKey.product.metadata as any,
      validatedAt: new Date(),
    };
  }

  /**
   * Revoke a license key
   */
  async revokeKey(keyString: string, reason: string, notes?: string) {
    const licenseKey = await this.prisma.licenseKey.findUnique({
      where: { keyString },
    });

    if (!licenseKey) {
      throw new NotFoundException(`Key ${keyString} not found`);
    }

    if (licenseKey.status === KeyStatus.REVOKED) {
      throw new ConflictException(`Key ${keyString} already revoked`);
    }

    const updated = await this.prisma.licenseKey.update({
      where: { id: licenseKey.id },
      data: {
        status: KeyStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    this.logger.log(`Revoked key ${keyString} for reason: ${reason}`);
    return updated;
  }

  /**
   * Get key by ID
   */
  async getKey(id: string) {
    const key = await this.prisma.licenseKey.findUnique({
      where: { id },
      include: {
        product: true,
        purchase: true,
      },
    });

    if (!key) {
      throw new NotFoundException(`Key ${id} not found`);
    }

    return key;
  }

  /**
   * Get key by key string
   */
  async getKeyByKeyString(keyString: string) {
    const key = await this.prisma.licenseKey.findUnique({
      where: { keyString },
      include: {
        product: true,
        purchase: true,
      },
    });

    if (!key) {
      throw new NotFoundException(`Key ${keyString} not found`);
    }

    return key;
  }

  /**
   * Query keys with filters
   */
  async queryKeys(params: {
    productId?: string;
    status?: KeyStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { productId, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.licenseKey.findMany({
        where,
        include: {
          product: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.licenseKey.count({ where }),
    ]);

    // Transform data to match DTO types
    const transformedData = data.map((key) => ({
      id: key.id,
      keyString: key.keyString,
      productId: key.productId,
      status: key.status,
      activations: key.activations,
      maxActivations: key.maxActivations,
      expiresAt: key.expiresAt || undefined,
      createdAt: key.createdAt,
    }));

    return {
      data: transformedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get key statistics
   */
  async getStats(productId?: string) {
    const where = productId ? { productId } : {};

    const [total, available, sold, active, revoked, expired] = await Promise.all([
      this.prisma.licenseKey.count({ where }),
      this.prisma.licenseKey.count({ where: { ...where, status: KeyStatus.AVAILABLE } }),
      this.prisma.licenseKey.count({ where: { ...where, status: KeyStatus.SOLD } }),
      this.prisma.licenseKey.count({ where: { ...where, status: KeyStatus.ACTIVE } }),
      this.prisma.licenseKey.count({ where: { ...where, status: KeyStatus.REVOKED } }),
      this.prisma.licenseKey.count({ where: { ...where, status: KeyStatus.EXPIRED } }),
    ]);

    return {
      total,
      available,
      sold,
      active,
      revoked,
      expired,
    };
  }

  /**
   * Mark key as sold
   */
  async markAsSold(keyId: string, purchaseId: string) {
    return this.prisma.licenseKey.update({
      where: { id: keyId },
      data: {
        status: KeyStatus.SOLD,
        purchaseId,
      },
    });
  }

  /**
   * Increment activation count
   */
  async incrementActivation(keyId: string) {
    const key = await this.prisma.licenseKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException(`Key ${keyId} not found`);
    }

    if (key.activations >= key.maxActivations) {
      throw new ConflictException('Maximum activations reached');
    }

    const updated = await this.prisma.licenseKey.update({
      where: { id: keyId },
      data: {
        activations: { increment: 1 },
        status: KeyStatus.ACTIVE,
      },
    });

    return updated;
  }
}
