import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate API key for valid user', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockApiKey = {
      id: 'key-1',
      keyHash: 'hash',
      name: 'Test Key',
      rateLimit: 10000,
      createdAt: new Date(),
    };

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.apiKey.create.mockResolvedValue(mockApiKey);

    const result = await service.generateApiKey('user-1', 'Test Key');

    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test Key');
    expect(result.key).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it('should throw NotFoundException when user not found', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.generateApiKey('invalid-user', 'Test Key')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should validate API key', async () => {
    const mockApiKey = {
      id: 'key-1',
      isActive: true,
      user: { id: 'user-1' },
    };

    mockPrismaService.apiKey.findUnique.mockResolvedValue(mockApiKey);
    mockPrismaService.apiKey.update.mockResolvedValue({});

    const result = await service.validateApiKey('valid-hash');

    expect(result).not.toBeNull();
    expect(result.id).toBe('key-1');
  });

  it('should return null for invalid API key', async () => {
    mockPrismaService.apiKey.findUnique.mockResolvedValue(null);

    const result = await service.validateApiKey('invalid-hash');

    expect(result).toBeNull();
  });
});
