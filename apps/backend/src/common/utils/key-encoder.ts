import { Buffer } from 'buffer';
import { randomBytes } from 'crypto';

/**
 * Key encoder for encoding product ID and random data
 * Structure: [Product ID (2 bytes)] + [Random (14 bytes)] = 16 bytes
 */

export class KeyEncoder {
  /**
   * Encode product ID with random data
   * @param productId - Product identifier (first 4 hex chars)
   * @returns 16 bytes encoded data
   */
  static encode(productId: string): Buffer {
    // Parse product ID as hex (should be 2 bytes)
    const productIdBytes = Buffer.from(productId.slice(0, 4), 'hex');

    if (productIdBytes.length !== 2) {
      throw new Error('Product ID must be at least 4 hex characters');
    }

    // Generate 14 random bytes
    const randomBytes = KeyEncoder.randomBytes(14);

    // Combine: product ID (2 bytes) + random (14 bytes)
    return Buffer.concat([productIdBytes, randomBytes]);
  }

  /**
   * Extract product ID from encoded key
   * @param data - 16 bytes encoded data
   * @returns Product ID as hex string
   */
  static decodeProductId(data: Buffer): string {
    if (data.length !== 16) {
      throw new Error('Encoded data must be exactly 16 bytes');
    }

    // First 2 bytes are product ID
    const productIdBytes = data.slice(0, 2);
    return productIdBytes.toString('hex').toUpperCase().slice(0, 4);
  }

  /**
   * Generate cryptographically secure random bytes
   * @param size - Number of bytes
   * @returns Random bytes
   */
  private static randomBytes(size: number): Buffer {
    return randomBytes(size);
  }
}
