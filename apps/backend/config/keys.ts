import { generateKeyPairSync } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Key management utilities for ECDSA-P256 key generation
 * Use for development setup only - production should use HSM/KMS
 */

export class KeyManager {
  /**
   * Generate ECDSA-P256 key pair for license signing
   * Saves to keys/ directory in backend root
   */
  static generateKeyPair(outputDir: string = join(process.cwd(), 'keys')) {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { mode: 0o700 });
    }

    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const privateKeyPath = join(outputDir, 'private.pem');
    const publicKeyPath = join(outputDir, 'public.pem');

    writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

    console.log('Generated ECDSA-P256 key pair:');
    console.log(`  Private key: ${privateKeyPath}`);
    console.log(`  Public key: ${publicKeyPath}`);
    console.log('\nAdd these to your .env file:');
    console.log(`  PRIVATE_KEY_PATH=${privateKeyPath}`);
    console.log(`  PUBLIC_KEY_PATH=${publicKeyPath}`);
    console.log('\nOr set LICENSE_PRIVATE_KEY and LICENSE_PUBLIC_KEY directly.');
  }

  /**
   * Generate random HMAC secret
   */
  static generateHmacSecret(): string {
    const secret = require('crypto').randomBytes(32).toString('base64');
    console.log('\nGenerated HMAC secret:');
    console.log(`  HMAC_SECRET=${secret}`);
    console.log('\nAdd this to your .env file.');
    return secret;
  }
}

// CLI interface
if (require.main === module) {
  console.log('License Key Shop - Key Generation Tool\n');
  console.log('Generating cryptographic keys for development...\n');

  KeyManager.generateKeyPair();
  KeyManager.generateHmacSecret();

  console.log('\n✓ Key generation complete!');
  console.log('\nIMPORTANT: Never commit private keys or HMAC secrets to git.');
  console.log('Add these files to .gitignore:');
  console.log('  keys/');
  console.log('  .env');
}
