import { Test, TestingModule } from '@nestjs/testing';
import { LicenseKeysService } from './license-keys.service';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from './crypto.service';
import { KeyGeneratorService } from './key-generator.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { KeyStatus } from '@prisma/client';

describe('LicenseKeysService', () => {
  let service: LicenseKeysService;
  let prismaService: PrismaService;
  let cryptoService: CryptoService;
  let keyGeneratorService: KeyGeneratorService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    licenseKey: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    validationLog: {
      create: jest.fn(),
    },
  };

  const mockCryptoService = {
    verifyCombined: jest.fn(),
  };

  const mockKeyGeneratorService = {
    generateKey: jest.fn(),
    generateKeys: jest.fn(),
    isValidFormat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseKeysService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: KeyGeneratorService,
          useValue: mockKeyGeneratorService,
        },
      ],
    }).compile();

    service = module.get<LicenseKeysService>(LicenseKeysService);
    prismaService = module.get<PrismaService>(PrismaService);
    cryptoService = module.get<CryptoService>(CryptoService);
    keyGeneratorService = module.get<KeyGeneratorService>(KeyGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate a license key successfully', async () => {
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        validityDays: 365,
        maxActivations: 3,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockKeyGeneratorService.generateKey.mockReturnValue({
        keyString: 'TEST-KEY-1234-ABCD',
        signature: 'signature123',
      });

      mockPrismaService.licenseKey.create.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234-ABCD',
        signature: 'signature123',
        productId,
        status: KeyStatus.AVAILABLE,
        maxActivations: 3,
        expiresAt: new Date(),
        product: mockProduct,
      });

      const result = await service.generateKey(productId);

      expect(result).toBeDefined();
      expect(result.keyString).toBe('TEST-KEY-1234-ABCD');
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
      });
      expect(mockPrismaService.licenseKey.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.generateKey('invalid-product')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generateKey('invalid-product')).rejects.toThrow(
        'Product invalid-product not found',
      );
    });

    it('should use custom validity days and max activations', async () => {
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        validityDays: 365,
        maxActivations: 3,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockKeyGeneratorService.generateKey.mockReturnValue({
        keyString: 'TEST-KEY-1234-ABCD',
        signature: 'signature123',
      });

      mockPrismaService.licenseKey.create.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234-ABCD',
        productId,
        status: KeyStatus.AVAILABLE,
        maxActivations: 5,
        expiresAt: new Date(),
      });

      await service.generateKey(productId, {
        validityDays: 730,
        maxActivations: 5,
      });

      const createCall = mockPrismaService.licenseKey.create.mock.calls[0][0];
      expect(createCall.data.maxActivations).toBe(5);
    });

    it('should handle product with no expiry', async () => {
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        validityDays: null,
        maxActivations: 1,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockKeyGeneratorService.generateKey.mockReturnValue({
        keyString: 'TEST-KEY-1234-ABCD',
        signature: 'signature123',
      });

      mockPrismaService.licenseKey.create.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234-ABCD',
        productId,
        status: KeyStatus.AVAILABLE,
        maxActivations: 1,
        expiresAt: null,
      });

      await service.generateKey(productId);

      const createCall = mockPrismaService.licenseKey.create.mock.calls[0][0];
      expect(createCall.data.expiresAt).toBeNull();
    });
  });

  describe('generateKeys', () => {
    it('should generate multiple keys', async () => {
      const productId = 'product-123';
      const count = 10;
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        validityDays: 365,
        maxActivations: 3,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockKeyGeneratorService.generateKeys.mockReturnValue(
        Array.from({ length: count }, (_, i) => ({
          keyString: `TEST-KEY-${i}`,
          signature: `signature${i}`,
        })),
      );

      mockPrismaService.licenseKey.createMany.mockResolvedValue({ count });

      const result = await service.generateKeys(productId, count);

      expect(result.count).toBe(count);
      expect(result.productId).toBe(productId);
      expect(mockPrismaService.licenseKey.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            productId,
            status: KeyStatus.AVAILABLE,
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.generateKeys('invalid-product', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateKey', () => {
    it('should reject invalid format', async () => {
      mockKeyGeneratorService.isValidFormat.mockReturnValue(false);

      const result = await service.validateKey('INVALID-FORMAT');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('INVALID_FORMAT');
      expect(result.reason).toBe('Invalid key format');
    });

    it('should return NOT_FOUND for non-existent key', async () => {
      mockKeyGeneratorService.isValidFormat.mockReturnValue(true);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue(null);

      const result = await service.validateKey('NON-EXISTENT-KEY');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('NOT_FOUND');
      expect(result.reason).toBe('Key not found');
    });

    it('should reject invalid signature', async () => {
      mockKeyGeneratorService.isValidFormat.mockReturnValue(true);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        signature: 'signature123',
        status: KeyStatus.AVAILABLE,
        product: { name: 'Test Product' },
      });
      mockCryptoService.verifyCombined.mockReturnValue(false);

      const result = await service.validateKey('TEST-KEY-1234');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('INVALID');
      expect(result.reason).toBe('Invalid signature');
    });

    it('should reject revoked keys', async () => {
      mockKeyGeneratorService.isValidFormat.mockReturnValue(true);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        signature: 'signature123',
        status: KeyStatus.REVOKED,
        revokedReason: 'Fraud detected',
        product: { name: 'Test Product' },
      });
      mockCryptoService.verifyCombined.mockReturnValue(true);

      const result = await service.validateKey('TEST-KEY-1234');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('REVOKED');
      expect(result.reason).toBe('Fraud detected');
    });

    it('should reject expired keys', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10);

      mockKeyGeneratorService.isValidFormat.mockReturnValue(true);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        signature: 'signature123',
        status: KeyStatus.ACTIVE,
        expiresAt: expiredDate,
        product: { name: 'Test Product' },
      });
      mockCryptoService.verifyCombined.mockReturnValue(true);
      mockPrismaService.licenseKey.update.mockResolvedValue({});

      const result = await service.validateKey('TEST-KEY-1234');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('EXPIRED');
      expect(result.reason).toBe('Key expired');
    });

    it('should reject keys with max activations reached', async () => {
      mockKeyGeneratorService.isValidFormat.mockReturnValue(true);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        signature: 'signature123',
        status: KeyStatus.ACTIVE,
        maxActivations: 3,
        activations: 3,
        expiresAt: null,
        product: { id: 'prod-123', name: 'Test Product' },
      });
      mockCryptoService.verifyCombined.mockReturnValue(true);

      const result = await service.validateKey('TEST-KEY-1234');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('MAX_ACTIVATIONS_REACHED');
      expect(result.activationsRemaining).toBe(0);
    });

    it('should validate successful key', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);

      mockKeyGeneratorService.isValidFormat.mockReturnValue(true);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        signature: 'signature123',
        status: KeyStatus.ACTIVE,
        maxActivations: 3,
        activations: 1,
        expiresAt: futureDate,
        product: {
          id: 'prod-123',
          name: 'Test Product',
          metadata: { features: ['feature1', 'feature2'] },
        },
      });
      mockCryptoService.verifyCombined.mockReturnValue(true);
      mockPrismaService.validationLog.create.mockResolvedValue({});

      const result = await service.validateKey('TEST-KEY-1234', {
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
      });

      expect(result.isValid).toBe(true);
      expect(result.productId).toBe('prod-123');
      expect(result.productName).toBe('Test Product');
      expect(result.activationsRemaining).toBe(2);
      expect(result.status).toBe(KeyStatus.ACTIVE);
      expect(mockPrismaService.validationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isValid: true,
          ipAddress: '192.168.1.1',
          userAgent: 'TestAgent/1.0',
        }),
      });
    });
  });

  describe('revokeKey', () => {
    it('should revoke a key successfully', async () => {
      const keyString = 'TEST-KEY-1234';
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        keyString,
        status: KeyStatus.ACTIVE,
      });
      mockPrismaService.licenseKey.update.mockResolvedValue({
        id: 'key-123',
        keyString,
        status: KeyStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: 'Refund requested',
      });

      const result = await service.revokeKey(keyString, 'Refund requested');

      expect(result.status).toBe(KeyStatus.REVOKED);
      expect(result.revokedReason).toBe('Refund requested');
      expect(mockPrismaService.licenseKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: expect.objectContaining({
          status: KeyStatus.REVOKED,
          revokedReason: 'Refund requested',
        }),
      });
    });

    it('should throw NotFoundException if key not found', async () => {
      mockPrismaService.licenseKey.findUnique.mockResolvedValue(null);

      await expect(service.revokeKey('NON-EXISTENT', 'reason')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already revoked', async () => {
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        status: KeyStatus.REVOKED,
      });

      await expect(service.revokeKey('TEST-KEY', 'reason')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.revokeKey('TEST-KEY', 'reason')).rejects.toThrow(
        'already revoked',
      );
    });
  });

  describe('getKey', () => {
    it('should return key with relations', async () => {
      const mockKey = {
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        product: { id: 'prod-123', name: 'Test Product' },
        purchase: { id: 'purchase-123' },
      };

      mockPrismaService.licenseKey.findUnique.mockResolvedValue(mockKey);

      const result = await service.getKey('key-123');

      expect(result).toEqual(mockKey);
      expect(mockPrismaService.licenseKey.findUnique).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        include: {
          product: true,
          purchase: true,
        },
      });
    });

    it('should throw NotFoundException if key not found', async () => {
      mockPrismaService.licenseKey.findUnique.mockResolvedValue(null);

      await expect(service.getKey('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('queryKeys', () => {
    it('should return paginated keys', async () => {
      const mockKeys = [
        { id: 'key-1', keyString: 'TEST-KEY-1', productId: 'prod-123' },
        { id: 'key-2', keyString: 'TEST-KEY-2', productId: 'prod-123' },
      ];

      mockPrismaService.licenseKey.findMany.mockResolvedValue(mockKeys);
      mockPrismaService.licenseKey.count.mockResolvedValue(2);

      const result = await service.queryKeys({
        productId: 'prod-123',
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.licenseKey.findMany.mockResolvedValue([]);
      mockPrismaService.licenseKey.count.mockResolvedValue(0);

      await service.queryKeys({
        status: KeyStatus.AVAILABLE,
      });

      const findManyCall = mockPrismaService.licenseKey.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe(KeyStatus.AVAILABLE);
    });

    it('should handle sorting', async () => {
      mockPrismaService.licenseKey.findMany.mockResolvedValue([]);
      mockPrismaService.licenseKey.count.mockResolvedValue(0);

      await service.queryKeys({
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      const findManyCall = mockPrismaService.licenseKey.findMany.mock.calls[0][0];
      expect(findManyCall.orderBy).toEqual({ createdAt: 'asc' });
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockPrismaService.licenseKey.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // available
        .mockResolvedValueOnce(30)  // sold
        .mockResolvedValueOnce(40)  // active
        .mockResolvedValueOnce(5)   // revoked
        .mockResolvedValueOnce(5);  // expired

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.available).toBe(20);
      expect(result.sold).toBe(30);
      expect(result.active).toBe(40);
      expect(result.revoked).toBe(5);
      expect(result.expired).toBe(5);
    });

    it('should filter by product', async () => {
      mockPrismaService.licenseKey.count.mockResolvedValue(10);

      await service.getStats('prod-123');

      const countCalls = mockPrismaService.licenseKey.count.mock.calls;
      countCalls.forEach(call => {
        expect(call[0].where.productId).toBe('prod-123');
      });
    });
  });

  describe('incrementActivation', () => {
    it('should increment activation count', async () => {
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        activations: 1,
        maxActivations: 3,
      });
      mockPrismaService.licenseKey.update.mockResolvedValue({
        id: 'key-123',
        activations: 2,
        status: KeyStatus.ACTIVE,
      });

      const result = await service.incrementActivation('key-123');

      expect(result.activations).toBe(2);
      expect(result.status).toBe(KeyStatus.ACTIVE);
    });

    it('should throw NotFoundException if key not found', async () => {
      mockPrismaService.licenseKey.findUnique.mockResolvedValue(null);

      await expect(service.incrementActivation('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if max activations reached', async () => {
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
        activations: 3,
        maxActivations: 3,
      });

      await expect(service.incrementActivation('key-123')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.incrementActivation('key-123')).rejects.toThrow(
        'Maximum activations reached',
      );
    });
  });
});
