import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let stripeService: StripeService;
  let configService: ConfigService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    purchase: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    licenseKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  const mockStripeService = {
    createCheckoutSession: jest.fn(),
    createSubscriptionSession: jest.fn(),
    getCheckoutSession: jest.fn(),
    processRefund: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);

    // Default config
    mockConfigService.get.mockReturnValue('http://localhost:3000');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckout', () => {
    const mockProduct = {
      id: 'prod-123',
      name: 'Test Product',
      price: 99.99,
      currency: 'USD',
      isActive: true,
      stripePriceId: 'price_123',
    };

    it('should create one-time checkout session', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockStripeService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/123',
        id: 'cs_123',
      });

      const result = await service.createCheckout('user-123', {
        productId: 'prod-123',
        mode: 'one_time',
        customerEmail: 'test@example.com',
      });

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/123');
      expect(result.sessionId).toBe('cs_123');
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-123',
          amount: 99.99,
          currency: 'USD',
        }),
      );
    });

    it('should create subscription checkout session', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockStripeService.createSubscriptionSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/subscription',
        id: 'cs_sub_123',
      });

      const result = await service.createCheckout('user-123', {
        productId: 'prod-123',
        mode: 'subscription',
        interval: 'month',
        customerEmail: 'test@example.com',
      });

      expect(result.checkoutUrl).toBeDefined();
      expect(result.sessionId).toBe('cs_sub_123');
      expect(mockStripeService.createSubscriptionSession).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckout('user-123', {
          productId: 'invalid-prod',
          mode: 'one_time',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createCheckout('user-123', {
          productId: 'invalid-prod',
          mode: 'one_time',
        }),
      ).rejects.toThrow('Product not found');
    });

    it('should throw if product is not active', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      mockPrismaService.product.findUnique.mockResolvedValue(inactiveProduct);

      await expect(
        service.createCheckout('user-123', {
          productId: 'prod-123',
          mode: 'one_time',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createCheckout('user-123', {
          productId: 'prod-123',
          mode: 'one_time',
        }),
      ).rejects.toThrow('not available');
    });

    it('should require interval for subscription mode', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.createCheckout('user-123', {
          productId: 'prod-123',
          mode: 'subscription',
        }),
      ).rejects.toThrow('Interval required for subscription');
    });

    it('should generate unique idempotency key', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockStripeService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/123',
        id: 'cs_123',
      });

      await service.createCheckout('user-123', {
        productId: 'prod-123',
        mode: 'one_time',
      });

      const createCall = mockStripeService.createCheckoutSession.mock.calls[0][0];
      expect(createCall.metadata.idempotencyKey).toBeDefined();
      expect(createCall.metadata.idempotencyKey.length).toBeGreaterThan(0);
    });
  });

  describe('getSessionStatus', () => {
    it('should return session status with purchase', async () => {
      const mockSession = {
        id: 'cs_123',
        status: 'complete',
        payment_status: 'paid',
        payment_intent: 'pi_123',
      };

      const mockPurchase = {
        id: 'purchase-123',
        licenseKey: {
          keyString: 'TEST-KEY-1234',
        },
        product: {
          name: 'Test Product',
        },
      };

      mockStripeService.getCheckoutSession.mockResolvedValue(mockSession);
      mockPrismaService.purchase.findFirst.mockResolvedValue(mockPurchase);

      const result = await service.getSessionStatus('cs_123');

      expect(result.sessionId).toBe('cs_123');
      expect(result.status).toBe('complete');
      expect(result.paymentStatus).toBe('paid');
      expect(result.purchaseId).toBe('purchase-123');
      expect(result.licenseKey).toBe('TEST-KEY-1234');
    });

    it('should return session status without purchase', async () => {
      const mockSession = {
        id: 'cs_123',
        status: 'expired',
        payment_status: 'unpaid',
        payment_intent: 'pi_123',
      };

      mockStripeService.getCheckoutSession.mockResolvedValue(mockSession);
      mockPrismaService.purchase.findFirst.mockResolvedValue(null);

      const result = await service.getSessionStatus('cs_123');

      expect(result.status).toBe('expired');
      expect(result.purchaseId).toBeNull();
      expect(result.licenseKey).toBeNull();
    });
  });

  describe('processRefund', () => {
    const mockPurchase = {
      id: 'purchase-123',
      status: 'COMPLETED',
      stripePaymentId: 'pi_123',
      amount: 99.99,
      currency: 'USD',
      licenseKey: {
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
      },
      refund: null,
    };

    it('should process full refund', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue(mockPurchase);
      mockStripeService.processRefund.mockResolvedValue({
        id: 're_123',
        amount: 9999,
      });
      mockPrismaService.refund.create.mockResolvedValue({
        id: 'refund-123',
      });
      mockPrismaService.licenseKey.update.mockResolvedValue({});
      mockPrismaService.purchase.update.mockResolvedValue({});

      const result = await service.processRefund('purchase-123');

      expect(result).toBeDefined();
      expect(mockStripeService.processRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123',
        amount: undefined,
        reason: undefined,
      });
      expect(mockPrismaService.licenseKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: expect.objectContaining({
          status: 'REVOKED',
          revokedReason: 'Refund processed',
        }),
      });
    });

    it('should process partial refund', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue(mockPurchase);
      mockStripeService.processRefund.mockResolvedValue({
        id: 're_123',
        amount: 5000,
      });
      mockPrismaService.refund.create.mockResolvedValue({});
      mockPrismaService.licenseKey.update.mockResolvedValue({});
      mockPrismaService.purchase.update.mockResolvedValue({});

      await service.processRefund('purchase-123', 50, 'Customer request');

      expect(mockStripeService.processRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123',
        amount: 50,
        reason: 'Customer request',
      });
    });

    it('should throw NotFoundException if purchase not found', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue(null);

      await expect(service.processRefund('invalid-purchase')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if purchase not completed', async () => {
      const pendingPurchase = { ...mockPurchase, status: 'PENDING' };
      mockPrismaService.purchase.findUnique.mockResolvedValue(pendingPurchase);

      await expect(service.processRefund('purchase-123')).rejects.toThrow(
        'Can only refund completed purchases',
      );
    });

    it('should throw if already refunded', async () => {
      const refundedPurchase = {
        ...mockPurchase,
        refund: { id: 'refund-123' },
      };
      mockPrismaService.purchase.findUnique.mockResolvedValue(refundedPurchase);

      await expect(service.processRefund('purchase-123')).rejects.toThrow(
        'Refund already processed',
      );
    });

    it('should handle purchase without license key', async () => {
      const noKeyPurchase = { ...mockPurchase, licenseKey: null };
      mockPrismaService.purchase.findUnique.mockResolvedValue(noKeyPurchase);
      mockStripeService.processRefund.mockResolvedValue({ id: 're_123' });
      mockPrismaService.refund.create.mockResolvedValue({});
      mockPrismaService.purchase.update.mockResolvedValue({});

      await service.processRefund('purchase-123');

      expect(mockPrismaService.licenseKey.update).not.toHaveBeenCalled();
    });
  });

  describe('handleCheckoutCompleted', () => {
    const mockEvent = {
      metadata: {
        productId: 'prod-123',
        userId: 'user-123',
        mode: 'one_time',
        idempotencyKey: 'uuid-123',
      },
      payment_intent: 'pi_123',
      customer_details: {
        email: 'test@example.com',
      },
      subscription: null,
      amount_total: 9999,
      currency: 'USD',
    };

    it('should create purchase and allocate license key', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        validityDays: 365,
      };

      const mockLicenseKey = {
        id: 'key-123',
        keyString: 'TEST-KEY-1234',
        status: 'AVAILABLE',
      };

      const mockPurchase = {
        id: 'purchase-123',
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.purchase.findFirst.mockResolvedValue(null);
      mockPrismaService.licenseKey.findFirst.mockResolvedValue(mockLicenseKey);
      mockPrismaService.licenseKey.update.mockResolvedValue({});
      mockPrismaService.purchase.create.mockResolvedValue(mockPurchase);
      mockPrismaService.transaction.create.mockResolvedValue({});

      const result = await service.handleCheckoutCompleted(mockEvent);

      expect(result).toBeDefined();
      expect(mockPrismaService.licenseKey.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'prod-123',
          status: 'AVAILABLE',
        },
      });
      expect(mockPrismaService.licenseKey.update).toHaveBeenCalled();
      expect(mockPrismaService.purchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          productId: 'prod-123',
          stripePaymentId: 'pi_123',
          amount: 99.99,
        }),
      });
    });

    it('should be idempotent', async () => {
      mockPrismaService.purchase.findFirst.mockResolvedValue({
        id: 'existing-purchase',
      });

      const result = await service.handleCheckoutCompleted(mockEvent);

      expect(result).toBeUndefined();
      expect(mockPrismaService.purchase.create).not.toHaveBeenCalled();
    });

    it('should handle subscription without license key', async () => {
      const subscriptionEvent = {
        ...mockEvent,
        metadata: { ...mockEvent.metadata, mode: 'subscription' },
        subscription: 'sub_123',
      };

      const mockProduct = {
        id: 'prod-123',
        name: 'Test Subscription',
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.purchase.findFirst.mockResolvedValue(null);
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-123' });
      mockPrismaService.transaction.create.mockResolvedValue({});

      await service.handleCheckoutCompleted(subscriptionEvent);

      expect(mockPrismaService.licenseKey.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.purchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stripeSubscriptionId: 'sub_123',
        }),
      });
    });
  });

  describe('handleInvoicePaid', () => {
    it('should extend license key expiry for subscription renewal', async () => {
      const mockEvent = {
        subscription: 'sub_123',
        customer: 'cus_123',
        payment_intent: 'pi_renewal',
        id: 'in_123',
        amount_paid: 9999,
        currency: 'USD',
      };

      const mockPurchase = {
        id: 'purchase-123',
        product: {
          id: 'prod-123',
          validityDays: 30,
        },
        licenseKey: {
          id: 'key-123',
          expiresAt: new Date('2026-02-01'),
        },
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(mockPurchase);
      mockPrismaService.licenseKey.update.mockResolvedValue({});
      mockPrismaService.purchase.update.mockResolvedValue({});
      mockPrismaService.transaction.create.mockResolvedValue({});

      await service.handleInvoicePaid(mockEvent);

      expect(mockPrismaService.licenseKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: {
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should handle missing purchase gracefully', async () => {
      const mockEvent = {
        subscription: 'sub_123',
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(null);

      await service.handleInvoicePaid(mockEvent);

      expect(mockPrismaService.licenseKey.update).not.toHaveBeenCalled();
    });
  });

  describe('handleChargeRefunded', () => {
    it('should revoke license key and create refund record', async () => {
      const mockEvent = {
        payment_intent: 'pi_123',
        amount: 9999,
        currency: 'USD',
        refund: 're_123',
      };

      const mockPurchase = {
        id: 'purchase-123',
        licenseKey: {
          id: 'key-123',
          keyString: 'TEST-KEY-1234',
        },
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(mockPurchase);
      mockPrismaService.licenseKey.update.mockResolvedValue({});
      mockPrismaService.refund.findUnique.mockResolvedValue(null);
      mockPrismaService.refund.create.mockResolvedValue({});
      mockPrismaService.purchase.update.mockResolvedValue({});

      await service.handleChargeRefunded(mockEvent);

      expect(mockPrismaService.licenseKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: {
          status: 'REVOKED',
          revokedAt: expect.any(Date),
          revokedReason: 'Refunded',
        },
      });
      expect(mockPrismaService.refund.create).toHaveBeenCalled();
    });

    it('should not duplicate refund record', async () => {
      const mockEvent = {
        payment_intent: 'pi_123',
      };

      const mockPurchase = {
        id: 'purchase-123',
        licenseKey: {
          id: 'key-123',
        },
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(mockPurchase);
      mockPrismaService.licenseKey.update.mockResolvedValue({});
      mockPrismaService.refund.findUnique.mockResolvedValue({ id: 'refund-123' });
      mockPrismaService.purchase.update.mockResolvedValue({});

      await service.handleChargeRefunded(mockEvent);

      expect(mockPrismaService.refund.create).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should revoke license key on subscription cancellation', async () => {
      const mockEvent = {
        id: 'sub_123',
      };

      const mockPurchase = {
        id: 'purchase-123',
        licenseKey: {
          id: 'key-123',
          keyString: 'TEST-KEY-1234',
        },
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(mockPurchase);
      mockPrismaService.licenseKey.update.mockResolvedValue({});

      await service.handleSubscriptionDeleted(mockEvent);

      expect(mockPrismaService.licenseKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: {
          status: 'REVOKED',
          revokedAt: expect.any(Date),
          revokedReason: 'Subscription cancelled',
        },
      });
    });

    it('should handle missing purchase', async () => {
      const mockEvent = {
        id: 'sub_123',
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(null);

      await service.handleSubscriptionDeleted(mockEvent);

      expect(mockPrismaService.licenseKey.update).not.toHaveBeenCalled();
    });
  });
});
