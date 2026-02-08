# Public Validation API Guide

## Overview

The License Key Shop provides a public API for third-party developers to validate license keys in their applications.

## Authentication

All validation requests require an API key in the Authorization header:

```
Authorization: Bearer <your_api_key>
```

### Getting an API Key

1. Authenticate via Clerk
2. Generate API key via `/api/api-keys` endpoint
3. Store securely (displayed only once)

## Endpoints

### POST /api/v1/validate

Validates a license key and returns its status.

**Request:**

```bash
curl -X POST https://api.example.com/api/v1/validate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "ABCD-1234-EFGH-5678",
    "productId": "prod_abc123",
    "metadata": {
      "version": "1.0.0",
      "environment": "production"
    }
  }'
```

**Response (Success):**

```json
{
  "isValid": true,
  "status": "ACTIVE",
  "keyString": "ABCD-1234-EFGH-5678",
  "productId": "prod_abc123",
  "productName": "My Product",
  "activationsRemaining": 3,
  "expiresAt": "2026-12-31T23:59:59Z",
  "validatedAt": "2026-02-07T10:30:00Z",
  "features": {
    "premium": true,
    "support": "24/7"
  }
}
```

**Response (Failure):**

```json
{
  "isValid": false,
  "status": "REVOKED",
  "reason": "Key has been revoked",
  "keyString": "ABCD-1234-EFGH-5678",
  "validatedAt": "2026-02-07T10:30:00Z"
}
```

## Rate Limiting

- **Default:** 10,000 requests per hour per API key
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

**Rate Limit Exceeded (429):**

```json
{
  "allowed": false,
  "remaining": 0,
  "resetAt": "2026-02-07T11:00:00Z",
  "message": "Rate limit exceeded. Try again later."
}
```

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Validation successful |
| 401 | Invalid API key |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Validation Flow

```
┌─────────┐      ┌──────────┐      ┌─────────────┐
│ Client  │─────▶│ API Key  │─────▶│ Rate Limit  │
│         │      │  Check   │      │   (Redis)   │
└─────────┘      └──────────┘      └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ Validation  │
                                        │   Service   │
                                        └─────────────┘
                                              │
                       ┌──────────────────────┼──────────────────────┐
                       ▼                      ▼                      ▼
                ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
                │   Signature │        │   Expiry   │        │ Activation  │
                │  Verification│       │    Check   │        │    Check    │
                └─────────────┘        └─────────────┘        └─────────────┘
                       │                      │                      │
                       └──────────────────────┼──────────────────────┘
                                              ▼
                                        ┌─────────────┐
                                        │   Response  │
                                        │   + Cache   │
                                        └─────────────┘
```

## SDK Examples

### Node.js / TypeScript

```typescript
const response = await fetch('https://api.example.com/api/v1/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    licenseKey: 'ABCD-1234-EFGH-5678',
    productId: 'prod_abc123',
  }),
});

const result = await response.json();
if (result.isValid) {
  console.log('License valid until:', result.expiresAt);
} else {
  console.error('License invalid:', result.reason);
}
```

### Python

```python
import requests

response = requests.post(
    'https://api.example.com/api/v1/validate',
    headers={'Authorization': f'Bearer {API_KEY}'},
    json={
        'licenseKey': 'ABCD-1234-EFGH-5678',
        'productId': 'prod_abc123',
    }
)

result = response.json()
if result['isValid']:
    print(f"License valid until: {result['expiresAt']}")
else:
    print(f"License invalid: {result['reason']}")
```

### cURL

```bash
curl -X POST https://api.example.com/api/v1/validate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ABCD-1234-EFGH-5678","productId":"prod_abc123"}'
```

## Best Practices

1. **Cache Results**: Store validation results locally for 5 minutes
2. **Handle 429**: Implement exponential backoff on rate limit
3. **Secure Keys**: Never expose API keys in client-side code
4. **Monitor Usage**: Track validation counts via stats endpoint
5. **Validate Early**: Check license on app startup

## Error Handling

```typescript
try {
  const result = await validateLicense(key);
  if (!result.isValid) {
    if (result.status === 'REVOKED') {
      // Disable app features
    } else if (result.status === 'EXPIRED') {
      // Show renewal prompt
    }
  }
} catch (error) {
  if (error.status === 429) {
    // Rate limit - retry later
  } else if (error.status === 401) {
    // Invalid API key - check configuration
  }
}
```

## API Documentation

Interactive documentation available at: `/api/docs`

## Support

For issues or questions, contact support@example.com
