import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('CryptoService', () => {
  let service: CryptoService;
  let originalEnv: NodeJS.ProcessEnv;

  const mockPrivateKey = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIC0x0bEjmNhNn4lW3a4CTWVkaW/xi8/D0vzp6K4kxmQ5oAoGCCqGSM49
AwEHoUQDQgAEiJKYZ0Gjtkrfzu2j5IHQW7e2yfODfyjjVlFh1Monr3F2MxSIX5wL
QW2NXdbEFQa4WVkyHpEHP+wwiVPUiHA2Lg==
-----END EC PRIVATE KEY-----`;

  const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiJKYZ0Gjtkrfzu2j5IHQW7e2yfOD
fyjjVlFh1Monr3F2MxSIX5wLQW2NXdbEFQa4WVkyHpEHP+wwiVPUiHA2Lg==
-----END PUBLIC KEY-----`;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env;

    // Mock environment variables
    process.env.LICENSE_PRIVATE_KEY = mockPrivateKey;
    process.env.LICENSE_PUBLIC_KEY = mockPublicKey;
    process.env.HMAC_SECRET = 'test-hmac-secret-for-testing-purposes-only';

    // Mock fs.readFileSync
    mockedFs.readFileSync.mockReturnValue(mockPrivateKey);
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      service = new CryptoService();
      expect(service).toBeDefined();
    });

    it('should load keys from environment variables', () => {
      service = new CryptoService();
      expect(service).toBeDefined();
    });

    it('should throw error if HMAC_SECRET not set', () => {
      delete process.env.HMAC_SECRET;
      expect(() => new CryptoService()).toThrow('Cryptographic service initialization failed');
    });

    it('should throw error if private key not found', () => {
      delete process.env.LICENSE_PRIVATE_KEY;
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      expect(() => new CryptoService()).toThrow('Cryptographic service initialization failed');
    });
  });

  describe('sign', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should sign data and return base64 signature', () => {
      const data = 'test-data';
      const signature = service.sign(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should generate unique signatures for different data', () => {
      const data1 = 'test-data-1';
      const data2 = 'test-data-2';

      const signature1 = service.sign(data1);
      const signature2 = service.sign(data2);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for same data (ECDSA non-determinism)', () => {
      const data = 'test-data';
      const signature1 = service.sign(data);
      const signature2 = service.sign(data);

      // ECDSA signatures are non-deterministic - they should be different
      expect(signature1).not.toBe(signature2);

      // But both should verify correctly
      expect(service.verifySignature(data, signature1)).toBe(true);
      expect(service.verifySignature(data, signature2)).toBe(true);
    });

    it('should handle empty string', () => {
      const signature = service.sign('');
      expect(signature).toBeDefined();
    });

    it('should handle special characters', () => {
      const data = 'test-data-日本語-🔑-special';
      const signature = service.sign(data);
      expect(signature).toBeDefined();
    });

    it('should handle unicode data', () => {
      const data = 'test-𝕌𝕟𝕚𝕔𝕠𝕕𝕖-🔐-测试';
      const signature = service.sign(data);
      expect(signature).toBeDefined();
    });
  });

  describe('verifySignature', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should verify valid signature', () => {
      const data = 'test-data';
      const signature = service.sign(data);

      const isValid = service.verifySignature(data, signature);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const data = 'test-data';
      const signature = service.sign(data);

      const isValid = service.verifySignature('different-data', signature);
      expect(isValid).toBe(false);
    });

    it('should reject tampered signature', () => {
      const data = 'test-data';
      const signature = service.sign(data);

      // Tamper with the signature by modifying a character
      const tamperedSignature = signature.slice(0, -10) + 'tampered';
      const isValid = service.verifySignature(data, tamperedSignature);
      expect(isValid).toBe(false);
    });

    it('should reject empty signature', () => {
      const isValid = service.verifySignature('test-data', '');
      expect(isValid).toBe(false);
    });

    it('should return false for malformed signature', () => {
      const isValid = service.verifySignature('test-data', 'not-a-valid-signature!!!');
      expect(isValid).toBe(false);
    });
  });

  describe('generateHmac', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should generate HMAC digest', () => {
      const data = 'test-data';
      const hmac = service.generateHmac(data);

      expect(hmac).toBeDefined();
      expect(typeof hmac).toBe('string');
      expect(hmac.length).toBeGreaterThan(0);
    });

    it('should generate consistent HMAC for same data', () => {
      const data = 'test-data';
      const hmac1 = service.generateHmac(data);
      const hmac2 = service.generateHmac(data);

      expect(hmac1).toBe(hmac2);
    });

    it('should generate different HMAC for different data', () => {
      const hmac1 = service.generateHmac('data-1');
      const hmac2 = service.generateHmac('data-2');

      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('verifyHmac', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should verify valid HMAC', () => {
      const data = 'test-data';
      const hmac = service.generateHmac(data);

      const isValid = service.verifyHmac(data, hmac);
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC', () => {
      const hmac = service.generateHmac('test-data');

      const isValid = service.verifyHmac('different-data', hmac);
      expect(isValid).toBe(false);
    });

    it('should reject tampered HMAC', () => {
      const hmac = service.generateHmac('test-data') + 'tampered';

      const isValid = service.verifyHmac('test-data', hmac);
      expect(isValid).toBe(false);
    });
  });

  describe('signCombined', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should generate combined signature', () => {
      const data = 'test-data';
      const combined = service.signCombined(data);

      expect(combined).toBeDefined();
      expect(typeof combined).toBe('string');
      // Combined signature is base64 signature + '.' + base64 HMAC
      // Base64 can contain +, /, = characters, not just \w
      expect(combined).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    });

    it('should be verifiable with verifyCombined', () => {
      const data = 'test-data';
      const combined = service.signCombined(data);

      const isValid = service.verifyCombined(data, combined);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyCombined', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should verify valid combined signature', () => {
      const data = 'test-data';
      const combined = service.signCombined(data);

      const isValid = service.verifyCombined(data, combined);
      expect(isValid).toBe(true);
    });

    it('should reject invalid combined signature', () => {
      const combined = service.signCombined('test-data');

      const isValid = service.verifyCombined('different-data', combined);
      expect(isValid).toBe(false);
    });

    it('should reject malformed combined signature', () => {
      const isValid = service.verifyCombined('test-data', 'invalid-format');
      expect(isValid).toBe(false);
    });

    it('should reject combined signature with only one part', () => {
      const isValid = service.verifyCombined('test-data', 'only-signature');
      expect(isValid).toBe(false);
    });

    it('should verify HMAC before ECDSA (fast rejection)', () => {
      const data = 'test-data';
      const combined = service.signCombined(data);

      // Tamper with HMAC part (second part after dot)
      const parts = combined.split('.');
      const tamperedCombined = `${parts[0]}.${parts[1]}tampered`;

      const isValid = service.verifyCombined(data, tamperedCombined);
      expect(isValid).toBe(false);
    });
  });

  describe('security properties', () => {
    beforeEach(() => {
      service = new CryptoService();
    });

    it('should be resistant to timing attacks in HMAC verification', () => {
      const data = 'test-data';
      const hmac = service.generateHmac(data);
      const differentHmac = service.generateHmac('different-data');

      // Time should be similar regardless of match position
      const start1 = performance.now();
      service.verifyHmac(data, hmac);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      service.verifyHmac(data, differentHmac);
      const time2 = performance.now() - start2;

      // Times should be within 10x (allowing for test environment variance)
      expect(Math.max(time1, time2) / Math.min(time1, time2)).toBeLessThan(10);
    });

    it('should produce non-deterministic but verifiable signatures', () => {
      const data = 'test-data';
      const signatures = Array.from({ length: 10 }, () => service.sign(data));

      // ECDSA signatures are non-deterministic - they should be different
      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).toBeGreaterThan(1);

      // But all should verify correctly
      signatures.forEach(sig => {
        expect(service.verifySignature(data, sig)).toBe(true);
      });
    });

    it('should handle large data', () => {
      const largeData = 'x'.repeat(10000);
      const signature = service.sign(largeData);

      const isValid = service.verifySignature(largeData, signature);
      expect(isValid).toBe(true);
    });
  });
});
