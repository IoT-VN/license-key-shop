import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { SePayService } from './sepay.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrismaService: Partial<PrismaService>;
  let mockSePayService: Partial<SePayService>;
  let mockConfigService: Partial<ConfigService>;

  const mockProduct = {
    id: 'prod-123',
    name: 'Test Product',
    description: 'Test Description',
    price: 100000,
    currency: 'VND',
    isActive: true,
    validityDays: 365,
    maxActivations: 1,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLicenseKey = {
    id: 'key-123',
    keyString: 'TEST-TEST-TEST-TEST',
    signature: 'sig123',
    productId: 'prod-123',
    status: 'AVAILABLE',
    activations: 0,
    maxActivations: 1,
    expiresAt: null,
    revokedAt: null,
    revokedReason: null,
    metadata: null,
    purchaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findUnique: jest.fn(),
      },
      purchase: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      licenseKey: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
      refund: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    mockSePayService = {
      createPayment: jest.fn().mockResolvedValue({
        qrCodeUrl: 'https://qr.sepay.vn/img?acc=0010000000355&bank=Vietcombank&amount=100000&des=ORDER_test-123',
        accountNumber: '0010000000355',
        bankCode: 'Vietcombank',
        amount: 100000,
        description: 'ORDER_test-123',
        orderId: 'test-123',
      }),
      extractOrderId: jest.fn().mockReturnValue('test-123'),
      generateQRCode: jest.fn().mockReturnValue('https://qr.sepay.vn/img?acc=0010000000355&bank=Vietcombank&amount=100000&des=ORDER_test-123'),
    } as any;

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SePayService,
          useValue: mockSePayService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should create checkout payment with QR code', async () => {
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(mockProduct);
      mockPrismaService.purchase.create = jest.fn().mockResolvedValue({
        id: 'purchase-123',
      });

      const result = await service.createCheckout('user-123', {
        productId: 'prod-123',
        mode: 'one_time',
        customerEmail: 'test@example.com',
      });

      expect(result.qrCodeUrl).toBeDefined();
      expect(result.accountNumber).toBe('0010000000355');
      expect(result.bankCode).toBe('Vietcombank');
      expect(result.amount).toBe(100000);
      expect(result.currency).toBe('VND');
      expect(result.orderId).toBeDefined();
      expect(mockSePayService.createPayment).toHaveBeenCalledWith({
        amount: 100000,
        currency: 'VND',
        description: expect.stringContaining('ORDER_'),
        orderId: expect.any(String),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.createCheckout('user-123', {
          productId: 'invalid-prod',
          mode: 'one_time',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for inactive products', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(inactiveProduct);

      await expect(
        service.createCheckout('user-123', {
          productId: 'prod-123',
          mode: 'one_time',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not support subscription mode', async () => {
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(mockProduct);

      await expect(
        service.createCheckout('user-123', {
          productId: 'prod-123',
          mode: 'subscription',
          interval: 'month',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrderStatus', () => {
    it('should return order status', async () => {
      const mockPurchase = {
        id: 'purchase-123',
        status: 'COMPLETED',
        amount: 100000,
        currency: 'VND',
        createdAt: new Date(),
        licenseKey: {
          keyString: 'TEST-TEST-TEST-TEST',
        },
        product: mockProduct,
      };

      mockPrismaService.purchase.findFirst = jest.fn().mockResolvedValue(mockPurchase);

      const result = await service.getOrderStatus('order-123');

      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe('COMPLETED');
      expect(result.licenseKey).toBe('TEST-TEST-TEST-TEST');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.purchase.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.getOrderStatus('invalid-order')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const mockPurchase = {
        id: 'purchase-123',
        status: 'COMPLETED',
        amount: 100000,
        currency: 'VND',
        stripePaymentId: null,
        licenseKey: {
          id: 'key-123',
        },
        refund: null,
      };

      mockPrismaService.purchase.findUnique = jest.fn().mockResolvedValue(mockPurchase);
      mockPrismaService.refund.findUnique = jest.fn().mockResolvedValue(null);
      mockPrismaService.refund.create = jest.fn().mockResolvedValue({
        id: 'refund-123',
      });
      mockPrismaService.licenseKey.update = jest.fn().mockResolvedValue({});
      mockPrismaService.purchase.update = jest.fn().mockResolvedValue({});

      const result = await service.processRefund('purchase-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.refund.create).toHaveBeenCalled();
      expect(mockPrismaService.licenseKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: {
          status: 'REVOKED',
          revokedAt: expect.any(Date),
          revokedReason: 'Refund processed',
        },
      });
    });

    it('should throw NotFoundException if purchase not found', async () => {
      mockPrismaService.purchase.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.processRefund('invalid-purchase')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not refund already refunded purchases', async () => {
      const mockPurchase = {
        id: 'purchase-123',
        status: 'COMPLETED',
        refund: { id: 'refund-123' },
      };

      mockPrismaService.purchase.findUnique = jest.fn().mockResolvedValue(mockPurchase);

      await expect(service.processRefund('purchase-123')).rejects.toThrow(
        'Refund already processed',
      );
    });
  });

  describe('handlePaymentWebhook', () => {
    it('should process payment webhook successfully', async () => {
      const mockPurchase = {
        id: 'purchase-123',
        productId: 'prod-123',
        amount: 100000,
        product: mockProduct,
      };

      const mockTransaction = {
        id: 123,
        transferAmount: 100000,
        content: 'ORDER_test-123',
        referenceCode: 'REF123',
        transactionDate: '2024-01-15 10:30:00',
        gateway: 'Vietcombank',
      };

      mockPrismaService.purchase.findFirst = jest.fn()
        .mockResolvedValueOnce(null) // No existing purchase
        .mockResolvedValueOnce(mockPurchase); // Found by order ID
      mockPrismaService.licenseKey.findFirst = jest.fn().mockResolvedValue(mockLicenseKey);
      mockPrismaService.licenseKey.update = jest.fn().mockResolvedValue({});
      mockPrismaService.purchase.update = jest.fn().mockResolvedValue({});
      mockPrismaService.transaction.create = jest.fn().mockResolvedValue({});

      mockSePayService.extractOrderId = jest.fn().mockReturnValue('test-123');

      const result = await service.handlePaymentWebhook(mockTransaction);

      expect(result).toBeDefined();
      expect(mockPrismaService.licenseKey.update).toHaveBeenCalled();
      expect(mockPrismaService.purchase.update).toHaveBeenCalledWith({
        where: { id: 'purchase-123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          sepayTransactionId: '123',
        }),
      });
    });

    it('should skip duplicate webhooks', async () => {
      const mockTransaction = {
        id: 123,
        transferAmount: 100000,
        content: 'ORDER_test-123',
        referenceCode: 'REF123',
        transactionDate: '2024-01-15 10:30:00',
        gateway: 'Vietcombank',
      };

      mockPrismaService.purchase.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-purchase',
      });

      await service.handlePaymentWebhook(mockTransaction);

      expect(mockPrismaService.licenseKey.findFirst).not.toHaveBeenCalled();
    });

    it('should reject amount mismatch', async () => {
      const mockPurchase = {
        id: 'purchase-123',
        productId: 'prod-123',
        amount: 100000,
        product: mockProduct,
      };

      const mockTransaction = {
        id: 123,
        transferAmount: 99999, // Wrong amount
        content: 'ORDER_test-123',
        referenceCode: 'REF123',
        transactionDate: '2024-01-15 10:30:00',
        gateway: 'Vietcombank',
      };

      mockPrismaService.purchase.findFirst = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPurchase);

      mockSePayService.extractOrderId = jest.fn().mockReturnValue('test-123');

      await service.handlePaymentWebhook(mockTransaction);

      expect(mockPrismaService.licenseKey.findFirst).not.toHaveBeenCalled();
    });
  });
});
