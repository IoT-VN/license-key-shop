import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { LicenseKeysService } from '../license-keys/license-keys.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('ValidationService', () => {
  let service: ValidationService;
  let licenseKeysService: LicenseKeysService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockLicenseKeysService = {
    validateKey: jest.fn(),
  };

  const mockPrismaService = {
    licenseKey: {
      findUnique: jest.fn(),
    },
    validationLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    getCache: jest.fn(),
    setCache: jest.fn(),
    deleteCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        {
          provide: LicenseKeysService,
          useValue: mockLicenseKeysService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    licenseKeysService = module.get<LicenseKeysService>(LicenseKeysService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateKey', () => {
    const apiKeyId = 'api-key-123';
    const keyString = 'TEST-KEY-1234-ABCD';
    const metadata = {
      ipAddress: '192.168.1.1',
      userAgent: 'TestApp/1.0',
    };

    it('should return cached validation result', async () => {
      const cachedResult = {
        isValid: true,
        keyString,
        productId: 'prod-123',
        validatedAt: new Date(),
      };

      mockRedisService.getCache.mockResolvedValue(cachedResult);

      const result = await service.validateKey(keyString, apiKeyId, metadata);

      expect(result).toEqual(cachedResult);
      expect(mockRedisService.getCache).toHaveBeenCalledWith(`validation:${keyString}`);
      expect(mockLicenseKeysService.validateKey).not.toHaveBeenCalled();
      expect(mockRedisService.setCache).not.toHaveBeenCalled();
    });

    it('should validate key and cache result when not cached', async () => {
      const validationResult = {
        isValid: true,
        keyString,
        productId: 'prod-123',
        productName: 'Test Product',
        status: 'ACTIVE',
        activationsRemaining: 2,
        validatedAt: new Date(),
      };

      mockRedisService.getCache.mockResolvedValue(null);
      mockLicenseKeysService.validateKey.mockResolvedValue(validationResult);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
      });
      mockPrismaService.validationLog.create.mockResolvedValue({});
      mockRedisService.setCache.mockResolvedValue(undefined);

      const result = await service.validateKey(keyString, apiKeyId, metadata);

      expect(result).toEqual(validationResult);
      expect(mockLicenseKeysService.validateKey).toHaveBeenCalledWith(
        keyString,
        metadata,
      );
      expect(mockPrismaService.validationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId,
          isValid: true,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        }),
      });
      expect(mockRedisService.setCache).toHaveBeenCalledWith(
        `validation:${keyString}`,
        validationResult,
        300,
      );
    });

    it('should handle invalid key validation', async () => {
      const validationResult = {
        isValid: false,
        keyString,
        status: 'INVALID',
        reason: 'Invalid signature',
        validatedAt: new Date(),
      };

      mockRedisService.getCache.mockResolvedValue(null);
      mockLicenseKeysService.validateKey.mockResolvedValue(validationResult);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
      });
      mockPrismaService.validationLog.create.mockResolvedValue({});
      mockRedisService.setCache.mockResolvedValue(undefined);

      const result = await service.validateKey(keyString, apiKeyId, metadata);

      expect(result.isValid).toBe(false);
      expect(mockPrismaService.validationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isValid: false,
          validationReason: 'Invalid signature',
        }),
      });
    });

    it('should handle missing license key gracefully', async () => {
      const validationResult = {
        isValid: false,
        keyString,
        status: 'NOT_FOUND',
        reason: 'Key not found',
        validatedAt: new Date(),
      };

      mockRedisService.getCache.mockResolvedValue(null);
      mockLicenseKeysService.validateKey.mockResolvedValue(validationResult);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue(null);
      mockRedisService.setCache.mockResolvedValue(undefined);

      const result = await service.validateKey(keyString, apiKeyId, metadata);

      expect(result).toEqual(validationResult);
      expect(mockPrismaService.validationLog.create).not.toHaveBeenCalled();
    });

    it('should work without metadata', async () => {
      const validationResult = {
        isValid: true,
        keyString,
        validatedAt: new Date(),
      };

      mockRedisService.getCache.mockResolvedValue(null);
      mockLicenseKeysService.validateKey.mockResolvedValue(validationResult);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
      });
      mockPrismaService.validationLog.create.mockResolvedValue({});
      mockRedisService.setCache.mockResolvedValue(undefined);

      await service.validateKey(keyString, apiKeyId);

      expect(mockPrismaService.validationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
    });

    it('should cache for 5 minutes (300 seconds)', async () => {
      const validationResult = {
        isValid: true,
        keyString,
        validatedAt: new Date(),
      };

      mockRedisService.getCache.mockResolvedValue(null);
      mockLicenseKeysService.validateKey.mockResolvedValue(validationResult);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({
        id: 'key-123',
      });
      mockPrismaService.validationLog.create.mockResolvedValue({});
      mockRedisService.setCache.mockResolvedValue(undefined);

      await service.validateKey(keyString, apiKeyId);

      expect(mockRedisService.setCache).toHaveBeenCalledWith(
        `validation:${keyString}`,
        validationResult,
        300,
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete cached validation result', async () => {
      const keyString = 'TEST-KEY-1234-ABCD';
      mockRedisService.deleteCache.mockResolvedValue(undefined);

      await service.invalidateCache(keyString);

      expect(mockRedisService.deleteCache).toHaveBeenCalledWith(`validation:${keyString}`);
    });

    it('should handle cache deletion errors gracefully', async () => {
      const keyString = 'TEST-KEY-1234-ABCD';
      mockRedisService.deleteCache.mockRejectedValue(
        new Error('Cache connection error'),
      );

      await expect(service.invalidateCache(keyString)).resolves.not.toThrow();
    });
  });

  describe('getValidationStats', () => {
    const apiKeyId = 'api-key-123';

    it('should return validation statistics without time range', async () => {
      mockPrismaService.validationLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85)  // successful
        .mockResolvedValueOnce(15); // failed

      mockPrismaService.validationLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          createdAt: new Date(),
          isValid: true,
          licenseKey: {
            keyString: 'TEST-KEY-1',
            product: {
              name: 'Product 1',
            },
          },
        },
        {
          id: 'log-2',
          createdAt: new Date(),
          isValid: false,
          licenseKey: {
            keyString: 'TEST-KEY-2',
            product: {
              name: 'Product 2',
            },
          },
        },
      ]);

      const result = await service.getValidationStats(apiKeyId);

      expect(result.total).toBe(100);
      expect(result.successful).toBe(85);
      expect(result.failed).toBe(15);
      expect(result.successRate).toBe(85);
      expect(result.recentValidations).toHaveLength(2);
      expect(mockPrismaService.validationLog.count).toHaveBeenCalledWith({
        where: { apiKeyId },
      });
    });

    it('should filter by time range when provided', async () => {
      const timeRange = {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      };

      mockPrismaService.validationLog.count.mockResolvedValue(50);
      mockPrismaService.validationLog.findMany.mockResolvedValue([]);

      await service.getValidationStats(apiKeyId, timeRange);

      const expectedDateFilter = {
        gte: timeRange.from,
        lte: timeRange.to,
      };

      const countCalls = mockPrismaService.validationLog.count.mock.calls;
      countCalls.forEach(call => {
        expect(call[0].where).toEqual(
          expect.objectContaining({
            apiKeyId,
            createdAt: expectedDateFilter,
          }),
        );
      });

      expect(mockPrismaService.validationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            apiKeyId,
            createdAt: expectedDateFilter,
          }),
        }),
      );
    });

    it('should handle zero validations', async () => {
      mockPrismaService.validationLog.count.mockResolvedValue(0);
      mockPrismaService.validationLog.findMany.mockResolvedValue([]);

      const result = await service.getValidationStats(apiKeyId);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.recentValidations).toHaveLength(0);
    });

    it('should calculate success rate correctly', async () => {
      mockPrismaService.validationLog.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(180) // successful
        .mockResolvedValueOnce(20);  // failed

      mockPrismaService.validationLog.findMany.mockResolvedValue([]);

      const result = await service.getValidationStats(apiKeyId);

      expect(result.successRate).toBe(90); // 180/200 * 100
    });

    it('should return recent validations with license key details', async () => {
      mockPrismaService.validationLog.count.mockResolvedValue(10);

      const recentValidations = [
        {
          id: 'log-1',
          createdAt: new Date(),
          isValid: true,
          licenseKey: {
            keyString: 'KEY-1234',
            product: {
              name: 'Product A',
            },
          },
        },
      ];

      mockPrismaService.validationLog.findMany.mockResolvedValue(recentValidations);

      const result = await service.getValidationStats(apiKeyId);

      expect(result.recentValidations).toEqual(recentValidations);
      expect(mockPrismaService.validationLog.findMany).toHaveBeenCalledWith({
        where: { apiKeyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          licenseKey: {
            select: {
              keyString: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should limit recent validations to 10', async () => {
      mockPrismaService.validationLog.count.mockResolvedValue(100);
      mockPrismaService.validationLog.findMany.mockResolvedValue([]);

      await service.getValidationStats(apiKeyId);

      const findManyCall = mockPrismaService.validationLog.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(10);
    });

    it('should order recent validations by creation date descending', async () => {
      mockPrismaService.validationLog.count.mockResolvedValue(10);
      mockPrismaService.validationLog.findMany.mockResolvedValue([]);

      await service.getValidationStats(apiKeyId);

      const findManyCall = mockPrismaService.validationLog.findMany.mock.calls[0][0];
      expect(findManyCall.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('cache behavior', () => {
    it('should log cache hit when result is cached', async () => {
      const keyString = 'TEST-KEY-1234';
      const cachedResult = { isValid: true, validatedAt: new Date() };

      mockRedisService.getCache.mockResolvedValue(cachedResult);

      await service.validateKey(keyString, 'api-key-123');

      expect(mockLicenseKeysService.validateKey).not.toHaveBeenCalled();
    });

    it('should log cache miss when result is not cached', async () => {
      const keyString = 'TEST-KEY-1234';
      const validationResult = { isValid: true, validatedAt: new Date() };

      mockRedisService.getCache.mockResolvedValue(null);
      mockLicenseKeysService.validateKey.mockResolvedValue(validationResult);
      mockPrismaService.licenseKey.findUnique.mockResolvedValue({ id: 'key-123' });
      mockPrismaService.validationLog.create.mockResolvedValue({});
      mockRedisService.setCache.mockResolvedValue(undefined);

      await service.validateKey(keyString, 'api-key-123');

      expect(mockLicenseKeysService.validateKey).toHaveBeenCalledWith(keyString, undefined);
      expect(mockRedisService.setCache).toHaveBeenCalled();
    });
  });
});
