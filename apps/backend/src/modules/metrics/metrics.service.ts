import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly register: Registry;
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly validationRequestsTotal: Counter;
  private readonly validationDuration: Histogram;
  private readonly paymentRequestsTotal: Counter;
  private readonly paymentDuration: Histogram;
  private readonly activeLicensesGauge: Counter;

  constructor() {
    this.register = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.register });

    // HTTP request metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    // License validation metrics
    this.validationRequestsTotal = new Counter({
      name: 'validation_requests_total',
      help: 'Total number of license validation requests',
      labelNames: ['status', 'product_id'],
      registers: [this.register],
    });

    this.validationDuration = new Histogram({
      name: 'validation_duration_seconds',
      help: 'Duration of license validation in seconds',
      labelNames: ['status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.register],
    });

    // Payment metrics
    this.paymentRequestsTotal = new Counter({
      name: 'payment_requests_total',
      help: 'Total number of payment requests',
      labelNames: ['type', 'status'],
      registers: [this.register],
    });

    this.paymentDuration = new Histogram({
      name: 'payment_duration_seconds',
      help: 'Duration of payment processing in seconds',
      labelNames: ['type', 'status'],
      buckets: [0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [this.register],
    });

    // Active licenses
    this.activeLicensesGauge = new Counter({
      name: 'active_licenses_total',
      help: 'Total number of active licenses',
      labelNames: ['product_id', 'status'],
      registers: [this.register],
    });

    this.logger.log('Metrics service initialized');
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({
      method,
      route: this.sanitizeRoute(route),
      status_code: statusCode,
    });

    this.httpRequestDuration.observe(
      {
        method,
        route: this.sanitizeRoute(route),
        status_code: statusCode,
      },
      duration / 1000, // Convert ms to seconds
    );
  }

  /**
   * Record validation request
   */
  recordValidationRequest(status: string, productId?: string, duration?: number) {
    this.validationRequestsTotal.inc({
      status,
      product_id: productId || 'unknown',
    });

    if (duration !== undefined) {
      this.validationDuration.observe(
        {
          status,
        },
        duration / 1000,
      );
    }
  }

  /**
   * Record payment request
   */
  recordPaymentRequest(type: string, status: string, duration?: number) {
    this.paymentRequestsTotal.inc({
      type,
      status,
    });

    if (duration !== undefined) {
      this.paymentDuration.observe(
        {
          type,
          status,
        },
        duration / 1000,
      );
    }
  }

  /**
   * Update active licenses count
   */
  updateActiveLicenses(productId: string, status: string, delta: number) {
    this.activeLicensesGauge.inc({
      product_id: productId,
      status,
    }, delta);
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Sanitize route to remove dynamic parameters
   */
  private sanitizeRoute(route: string): string {
    return route
      .replace(/\/[0-9a-f-]{36}/gi, '/:id')
      .replace(/\/[^\/]+\.[^\/]+/gi, '/:file')
      .replace(/\/\d+/gi, '/:id');
  }
}
