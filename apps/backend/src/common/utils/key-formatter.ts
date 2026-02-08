import { Buffer } from 'buffer';

/**
 * Key formatter for license key display format
 * Format: XXXX-XXXX-XXXX-XXXX (uppercase hex, hyphen-separated)
 */

export class KeyFormatter {
  /**
   * Format raw bytes as XXXX-XXXX-XXXX-XXXX
   * @param data - 16 bytes of data
   * @returns Formatted key string
   */
  static format(data: Buffer): string {
    if (data.length !== 16) {
      throw new Error('Key data must be exactly 16 bytes');
    }

    const hex = data.toString('hex').toUpperCase();
    return [
      hex.slice(0, 4),
      hex.slice(4, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
    ].join('-');
  }

  /**
   * Parse formatted key back to bytes
   * @param keyString - Formatted key string
   * @returns Raw bytes
   */
  static parse(keyString: string): Buffer {
    const hex = keyString.replace(/-/g, '').toLowerCase();

    if (hex.length !== 32) {
      throw new Error('Invalid key format: must be 16 hex bytes');
    }

    if (!/^[0-9a-f]{32}$/.test(hex)) {
      throw new Error('Invalid key format: must contain only hex characters');
    }

    return Buffer.from(hex, 'hex');
  }

  /**
   * Validate key format
   * @param keyString - Key string to validate
   * @returns True if valid format
   */
  static isValid(keyString: string): boolean {
    try {
      this.parse(keyString);
      return true;
    } catch {
      return false;
    }
  }
}
