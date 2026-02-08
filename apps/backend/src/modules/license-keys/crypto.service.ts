import { Injectable, Logger } from '@nestjs/common';
import { createSign, createVerify, createHmac, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import * as path from 'path';

/**
 * Cryptographic service for ECDSA-P256 signing and HMAC verification
 * Uses Node.js crypto module (FIPS compliant)
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private privateKey: string;
  private publicKey: string;
  private hmacSecret: string;

  constructor() {
    // Load keys from environment or files
    this.privateKey = this.loadPrivateKey();
    this.publicKey = this.loadPublicKey();
    this.hmacSecret = this.loadHmacSecret();

    this.validateKeys();
  }

  /**
   * Sign data with ECDSA-P256 private key
   * @param data - Data to sign
   * @returns Base64-encoded signature
   */
  sign(data: string): string {
    try {
      const sign = createSign('SHA256');
      sign.update(data);
      sign.end();

      const signature = sign.sign(this.privateKey, 'base64');
      return signature;
    } catch (error) {
      this.logger.error('Failed to sign data', error.stack);
      throw new Error('Signing operation failed');
    }
  }

  /**
   * Verify ECDSA signature
   * @param data - Original data
   * @param signature - Signature to verify
   * @returns True if signature valid
   */
  verifySignature(data: string, signature: string): boolean {
    try {
      const verify = createVerify('SHA256');
      verify.update(data);
      verify.end();

      return verify.verify(this.publicKey, signature, 'base64');
    } catch (error) {
      this.logger.warn('Signature verification failed', error.stack);
      return false;
    }
  }

  /**
   * Generate HMAC-SHA256 checksum
   * @param data - Data to authenticate
   * @returns Base64-encoded HMAC digest
   */
  generateHmac(data: string): string {
    const hmac = createHmac('sha256', this.hmacSecret);
    hmac.update(data);
    return hmac.digest('base64');
  }

  /**
   * Verify HMAC checksum
   * @param data - Original data
   * @param hmacDigest - HMAC to verify
   * @returns True if HMAC valid
   */
  verifyHmac(data: string, hmacDigest: string): boolean {
    try {
      const expectedHmac = this.generateHmac(data);
      return constantTimeStringCompare(expectedHmac, hmacDigest);
    } catch (error) {
      this.logger.warn('HMAC verification failed', error.stack);
      return false;
    }
  }

  /**
   * Sign with ECDSA and HMAC combined
   * Format: ${signature}.${hmacDigest}
   * @param data - Data to sign
   * @returns Combined signature
   */
  signCombined(data: string): string {
    const signature = this.sign(data);
    const hmacDigest = this.generateHmac(data + signature);
    return `${signature}.${hmacDigest}`;
  }

  /**
   * Verify combined signature (HMAC first for fast rejection)
   * @param data - Original data
   * @param combinedSignature - Combined signature to verify
   * @returns True if valid
   */
  verifyCombined(data: string, combinedSignature: string): boolean {
    try {
      const [signature, hmacDigest] = combinedSignature.split('.');

      if (!signature || !hmacDigest) {
        return false;
      }

      // Verify HMAC first (faster)
      const hmacData = data + signature;
      if (!this.verifyHmac(hmacData, hmacDigest)) {
        return false;
      }

      // Then verify ECDSA signature
      return this.verifySignature(data, signature);
    } catch (error) {
      this.logger.warn('Combined signature verification failed', error.stack);
      return false;
    }
  }

  /**
   * Load private key from environment or file
   */
  private loadPrivateKey(): string {
    const envKey = process.env.LICENSE_PRIVATE_KEY;
    if (envKey) {
      return envKey;
    }

    const keyPath = process.env.PRIVATE_KEY_PATH || path.join(process.cwd(), 'keys', 'private.pem');
    try {
      return readFileSync(keyPath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to load private key from ${keyPath}`);
      throw new Error('Private key not found. Set LICENSE_PRIVATE_KEY or PRIVATE_KEY_PATH');
    }
  }

  /**
   * Load public key from environment or file
   */
  private loadPublicKey(): string {
    const envKey = process.env.LICENSE_PUBLIC_KEY;
    if (envKey) {
      return envKey;
    }

    const keyPath = process.env.PUBLIC_KEY_PATH || path.join(process.cwd(), 'keys', 'public.pem');
    try {
      return readFileSync(keyPath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to load public key from ${keyPath}`);
      throw new Error('Public key not found. Set LICENSE_PUBLIC_KEY or PUBLIC_KEY_PATH');
    }
  }

  /**
   * Load HMAC secret from environment
   */
  private loadHmacSecret(): string {
    const secret = process.env.HMAC_SECRET;
    if (!secret) {
      this.logger.error('HMAC_SECRET not set in environment');
      throw new Error('HMAC_SECRET must be set in environment');
    }
    return secret;
  }

  /**
   * Validate keys are properly formatted
   */
  private validateKeys(): void {
    try {
      // Test signing/verification
      const testData = 'test-validation-data';
      const signature = this.sign(testData);

      if (!this.verifySignature(testData, signature)) {
        throw new Error('Key validation failed: signature verification');
      }

      // Test HMAC
      const hmac = this.generateHmac(testData);
      if (!this.verifyHmac(testData, hmac)) {
        throw new Error('Key validation failed: HMAC verification');
      }

      this.logger.log('Cryptographic keys validated successfully');
    } catch (error) {
      this.logger.error('Key validation failed', error.stack);
      throw error;
    }
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings match
 */
function constantTimeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
