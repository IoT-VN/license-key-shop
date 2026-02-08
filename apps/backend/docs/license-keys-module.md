# License Keys Module

Cryptographically secure license key generation using ECDSA-P256 with HMAC-SHA256.

## Features

- **ECDSA-P256 Signing**: NIST-standard cryptographic signatures
- **HMAC-SHA256**: Integrity verification (RFC 2104)
- **Key Format**: XXXX-XXXX-XXXX-XXXX (hex, uppercase, hyphen-separated)
- **Batch Generation**: Generate up to 10,000 keys at once
- **Validation API**: Public endpoint for key verification
- **Key Revocation**: Admin-only revocation with reason tracking
- **Rate Limiting**: 10 requests/second for validation API

## Architecture

### Key Structure

```
License Key: XXXX-XXXX-XXXX-XXXX
├─ Encoded: Product ID (2 bytes) + Random (14 bytes) = 16 bytes
├─ Display Format: Hex + Uppercase + Hyphens
├─ Signature: ECDSA-P256 + HMAC-SHA256
└─ Storage: keyString + signature + metadata
```

### Services

- **CryptoService**: ECDSA signing/verification, HMAC generation/validation
- **KeyGeneratorService**: Key generation algorithm, batch generation
- **LicenseKeysService**: CRUD operations, validation logic, revocation

## Setup

### 1. Generate Cryptographic Keys

```bash
cd apps/backend
npm run generate-crypto-keys
```

This creates:
- `keys/private.pem` - ECDSA private key (chmod 0600)
- `keys/public.pem` - ECDSA public key
- `HMAC_SECRET` - Random 32-byte secret

### 2. Update Environment

Add to `.env`:
```bash
# Option 1: File paths (recommended for dev)
PRIVATE_KEY_PATH="./keys/private.pem"
PUBLIC_KEY_PATH="./keys/public.pem"
HMAC_SECRET="your-generated-secret"

# Option 2: Direct keys (useful for production/HSM)
LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
HMAC_SECRET="your-secret-min-32-chars"
```

### 3. Security Notes

- **Never commit** private keys or HMAC secrets to git
- Add `keys/` to `.gitignore`
- Use HSM/KMS for production key storage
- Rotate keys quarterly (document procedure)
- Set file permissions: private keys (0600), public keys (0644)

## Usage

### Generate Keys

#### Single Key
```bash
curl -X POST http://localhost:3001/license-keys/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"productId": "prod_abc123"}'
```

#### Batch Generation
```bash
curl -X POST http://localhost:3001/license-keys/generate/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "productId": "prod_abc123",
    "count": 1000,
    "validityDays": 365,
    "maxActivations": 1
  }'
```

#### CLI Script
```bash
npm run generate-keys -- -p prod_abc123 -n 1000 -v 365 -a 1
```

### Validate Keys

```bash
curl -X POST http://localhost:3001/license-keys/validate \
  -H "Content-Type: application/json" \
  -d '{
    "keyString": "ABCD-1234-EFGH-5678"
  }'
```

Response:
```json
{
  "isValid": true,
  "keyString": "ABCD-1234-EFGH-5678",
  "productId": "prod_abc123",
  "productName": "My Product",
  "status": "AVAILABLE",
  "activationsRemaining": 1,
  "expiresAt": "2026-02-07T00:00:00.000Z",
  "validatedAt": "2026-02-07T18:00:00.000Z"
}
```

### Revoke Keys

```bash
curl -X POST http://localhost:3001/license-keys/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "keyString": "ABCD-1234-EFGH-5678",
    "reason": "REFUND",
    "notes": "Customer requested refund"
  }'
```

### Query Keys

```bash
curl "http://localhost:3001/license-keys?status=AVAILABLE&page=1&limit=20" \
  -H "Authorization: Bearer <admin-token>"
```

### Key Statistics

```bash
curl "http://localhost:3001/license-keys/stats/summary" \
  -H "Authorization: Bearer <admin-token>"
```

Response:
```json
{
  "total": 10000,
  "available": 7500,
  "sold": 2000,
  "active": 1500,
  "revoked": 50,
  "expired": 450
}
```

## API Endpoints

### Public Endpoints

- `POST /license-keys/validate` - Validate license key (rate limited)

### Admin Endpoints (Require Admin Role)

- `POST /license-keys/generate` - Generate single key
- `POST /license-keys/generate/batch` - Generate multiple keys
- `POST /license-keys/revoke` - Revoke key
- `GET /license-keys/:id` - Get key by ID
- `GET /license-keys/key-string/:keyString` - Get key by string
- `GET /license-keys` - Query keys with filters
- `GET /license-keys/stats/summary` - Key statistics

## Performance

- **Generation**: 1,000 keys in < 5 seconds
- **Validation**: < 10ms per key
- **Batch Size**: Up to 10,000 keys per request

## Security Considerations

### Cryptography
- ECDSA-P256 (NIST standard)
- HMAC-SHA256 (RFC 2104)
- Constant-time comparison for signatures
- Node.js crypto module (FIPS compliant)

### Key Management
- Private keys in HSM (production) or encrypted files (dev)
- File permissions: 0600 (private), 0644 (public)
- Never log private keys
- Quarterly key rotation

### Input Validation
- Key format validation before lookup
- Product ID sanitization
- Rate limiting (10 req/sec for validation)
- Admin permission checks
- Batch size limits (max 10,000)

### Audit & Monitoring
- Log all key generation events
- Track validation failures
- Monitor unusual patterns
- Alert on revocation spikes

## Testing

```bash
# Unit tests
npm test -- license-keys

# Integration tests
npm run test:e2e

# Performance tests
npm run test:perf
```

## Troubleshooting

### Keys Not Generating
- Check `PRIVATE_KEY_PATH` and `PUBLIC_KEY_PATH` in `.env`
- Verify key files exist and have correct permissions
- Check `HMAC_SECRET` is set (min 32 characters)

### Validation Failing
- Verify key format: XXXX-XXXX-XXXX-XXXX
- Check key exists in database
- Verify ECDSA signature
- Check key status (not revoked/expired)

### Performance Issues
- Check database indexes on `keyString` and `productId`
- Verify Redis caching is working
- Monitor validation response times

## References

- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html)
- [ECDSA vs RSA vs HMAC](https://workos.com/blog/hmac-vs-rsa-vs-ecdsa-which-algorithm-should-you-use-to-sign-jwts)
- [NIST Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
