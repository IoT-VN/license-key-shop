import { Injectable, Logger } from '@nestjs/common';
import { KeyFormatter } from '../../common/utils/key-formatter';
import { KeyEncoder } from '../../common/utils/key-encoder';
import { CryptoService } from './crypto.service';

/**
 * License key generation service
 * Generates cryptographically secure keys in XXXX-XXXX-XXXX-XXXX format
 */
@Injectable()
export class KeyGeneratorService {
  private readonly logger = new Logger(KeyGeneratorService.name);

  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * Generate a single license key
   * @param productId - Product identifier (hex string, min 4 chars)
   * @returns Key string and signature
   */
  generateKey(productId: string): { keyString: string; signature: string } {
    try {
      // Encode product ID with random data
      const encoded = KeyEncoder.encode(productId);

      // Format as XXXX-XXXX-XXXX-XXXX
      const keyString = KeyFormatter.format(encoded);

      // Sign with ECDSA + HMAC
      const signature = this.cryptoService.signCombined(keyString);

      this.logger.debug(`Generated key: ${keyString} for product: ${productId}`);
      return { keyString, signature };
    } catch (error) {
      this.logger.error(`Failed to generate key for product ${productId}`, error.stack);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Generate multiple license keys
   * @param productId - Product identifier
   * @param count - Number of keys to generate
   * @returns Array of key strings and signatures
   */
  generateKeys(productId: string, count: number): Array<{ keyString: string; signature: string }> {
    if (count <= 0 || count > 10000) {
      throw new Error('Count must be between 1 and 10000');
    }

    const keys: Array<{ keyString: string; signature: string }> = [];
    const seen = new Set<string>();

    for (let i = 0; i < count; i++) {
      const key = this.generateKey(productId);

      // Ensure uniqueness (collision check)
      if (seen.has(key.keyString)) {
        this.logger.warn(`Key collision detected: ${key.keyString}, regenerating`);
        i--; // Retry
        continue;
      }

      seen.add(key.keyString);
      keys.push(key);
    }

    this.logger.log(`Generated ${count} unique keys for product ${productId}`);
    return keys;
  }

  /**
   * Generate keys in batches for memory efficiency
   * @param productId - Product identifier
   * @param count - Total number of keys
   * @param batchSize - Keys per batch (default: 100)
   * @returns Async generator of key batches
   */
  async *generateKeysBatched(
    productId: string,
    count: number,
    batchSize: number = 100,
  ): AsyncGenerator<Array<{ keyString: string; signature: string }>> {
    if (count <= 0 || count > 10000) {
      throw new Error('Count must be between 1 and 10000');
    }

    if (batchSize <= 0 || batchSize > 1000) {
      throw new Error('Batch size must be between 1 and 1000');
    }

    let generated = 0;
    const seen = new Set<string>();

    while (generated < count) {
      const remaining = count - generated;
      const currentBatchSize = Math.min(batchSize, remaining);
      const batch: Array<{ keyString: string; signature: string }> = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const key = this.generateKey(productId);

        // Ensure uniqueness
        if (seen.has(key.keyString)) {
          this.logger.warn(`Key collision: ${key.keyString}, regenerating`);
          i--;
          continue;
        }

        seen.add(key.keyString);
        batch.push(key);
      }

      generated += batch.length;
      this.logger.debug(`Generated batch of ${batch.length} keys (${generated}/${count} total)`);

      yield batch;
    }

    this.logger.log(`Completed batched generation: ${generated} keys for product ${productId}`);
  }

  /**
   * Validate key format without database lookup
   * @param keyString - Key string to validate
   * @returns True if format valid
   */
  isValidFormat(keyString: string): boolean {
    return KeyFormatter.isValid(keyString);
  }
}
