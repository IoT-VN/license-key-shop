# SePay Integration Guide

This guide explains how to integrate and configure SePay payment gateway for the License Key Shop application.

## Overview

SePay is a Vietnamese payment gateway that supports:
- **VietQR**: QR code bank transfers (NAPAS standard)
- **Bank Transfers**: Direct bank-to-bank transfers
- **44+ Vietnamese banks**: Vietcombank, VPBank, BIDV, Techcombank, etc.
- **Currency**: VND (Vietnamese Dong)

## Architecture

### Payment Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Customer  │         │   Backend   │         │    SePay    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Select Product    │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │  2. Create Payment    │                       │
       │<──────────────────────│                       │
       │  (QR Code URL)        │                       │
       │                       │                       │
       │  3. Display QR        │                       │
       │                       │                       │
       │  4. Scan & Pay        │                       │
       │──────────────────────────────────────────────>│
       │                       │                       │
       │                       │  5. Webhook           │
       │                       │<──────────────────────│
       │                       │  (Payment Confirm)    │
       │                       │                       │
       │  6. Receive License   │                       │
       │<──────────────────────│                       │
       │                       │                       │
└───────┴───────────────────────┴───────────────────────┘
```

### Components

- **SePayService**: Handles QR code generation and webhook verification
- **PaymentsController**: Manages payment creation and status checking
- **WebhooksController**: Processes SePay webhook notifications
- **PaymentsService**: Business logic for payment processing

## Configuration

### 1. SePay Account Setup

1. **Create SePay Account**:
   - Go to https://my.sepay.vn
   - Register with your business information
   - Complete KYC verification

2. **Get API Credentials**:
   - Navigate to Company Configuration → API Access
   - Click "+ Add API"
   - Provide a name (e.g., "License Key Shop")
   - Copy the API Key

3. **Add Bank Account**:
   - Go to Bank Accounts section
   - Add your business bank account
   - Note the bank code (e.g., "Vietcombank", "VPBank")

4. **Configure Webhook**:
   - Go to WebHooks menu
   - Click "+ Add webhooks"
   - Configure:
     - **Name**: "License Key Shop Payment"
     - **Event Selection**: "In_only"
     - **Webhook URL**: `https://your-api.railway.app/webhooks/sepay`
     - **Authentication**: "Api_Key"
     - **Is Verify Payment**: true
   - Click "Add" to save

### 2. Backend Configuration

Update `apps/backend/.env`:

```env
# SePay Payment Gateway
SEPAY_API_KEY="your-sepay-api-key"
SEPAY_API_URL="https://my.sepay.vn/userapi"
SEPAY_BANK_ACCOUNT="0010000000355"
SEPAY_BANK_CODE="Vietcombank"
SEPAY_QR_URL="https://qr.sepay.vn/img"
SEPAY_WEBHOOK_ENDPOINT="https://your-api.railway.app/webhooks/sepay"
```

### 3. Frontend Configuration

Update `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

## API Reference

### Create Payment

**Endpoint**: `POST /api/payments/create-checkout`

**Authentication**: Required (Clerk JWT)

**Request Body**:
```json
{
  "productId": "product-id-here",
  "mode": "one_time"
}
```

**Response**:
```json
{
  "success": true,
  "qrCodeUrl": "https://qr.sepay.vn/img?acc=...&bank=...&amount=...",
  "accountNumber": "0010000000355",
  "bankCode": "Vietcombank",
  "amount": 100000,
  "description": "ORDER_uuid",
  "orderId": "uuid",
  "currency": "VND"
}
```

### Get Order Status

**Endpoint**: `GET /api/payments/order/:orderId`

**Response**:
```json
{
  "success": true,
  "orderId": "uuid",
  "status": "COMPLETED",
  "amount": 100000,
  "currency": "VND",
  "purchaseId": "purchase-id",
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Webhook Handler

**Endpoint**: `POST /webhooks/sepay`

**Authentication**: API Key (SePay)

**Webhook Payload**:
```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2024-01-15 10:30:00",
  "accountNumber": "0123499999",
  "code": null,
  "content": "ORDER_uuid",
  "transferType": "in",
  "transferAmount": 100000,
  "accumulated": 19077000,
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687"
}
```

**Response**: `{ "received": true, "success": true }`

## Payment Process

### Step-by-Step Flow

1. **Customer Checkout**:
   - Customer selects product
   - Backend creates pending purchase with unique order ID
   - Backend generates QR code URL
   - Frontend displays QR code and bank details

2. **Customer Payment**:
   - Customer scans QR code with banking app
   - Or manually transfers to bank account
   - Customer must enter exact amount
   - Customer must use exact content/description

3. **Payment Confirmation**:
   - Bank notifies SePay of successful transfer
   - SePay sends webhook to backend
   - Backend verifies webhook signature
   - Backend checks order ID in content
   - Backend verifies amount matches
   - Backend allocates license key
   - Backend updates purchase status to COMPLETED
   - Backend sends confirmation email (TODO)

4. **License Delivery**:
   - Customer checks payment status
   - Backend returns license key if payment confirmed
   - Customer receives license key in dashboard
   - Customer receives email with license key (TODO)

### QR Code Format

The QR code URL follows this format:

```
https://qr.sepay.vn/img?
  acc=0010000000355&
  bank=Vietcombank&
  amount=100000&
  des=ORDER_uuid
```

Parameters:
- `acc`: Bank account number
- `bank`: Bank code or short name
- `amount`: Payment amount (VND)
- `des`: Transfer content/description (URL encoded)

## Security Best Practices

### 1. Webhook Verification

Always verify webhook signatures:

```typescript
const isValid = this.sepay.verifyWebhook(authHeader);
if (!isValid) {
  return { received: false, error: "Invalid signature" };
}
```

### 2. Idempotency

Prevent duplicate processing:

```typescript
const existingPurchase = await this.prisma.purchase.findFirst({
  where: { sepayTransactionId: transaction.id.toString() }
});

if (existingPurchase) {
  return; // Already processed
}
```

### 3. Amount Verification

Always verify payment amount:

```typescript
if (transaction.transferAmount !== expectedAmount) {
  this.logger.error(`Amount mismatch: expected ${expectedAmount}, got ${transaction.transferAmount}`);
  return;
}
```

### 4. Order ID Matching

Extract and verify order ID:

```typescript
const orderId = this.sepay.extractOrderId(transaction.content);
if (!orderId) {
  this.logger.warn(`Could not extract order ID from: ${transaction.content}`);
  return;
}
```

## Error Handling

### Common Errors

1. **Invalid API Key**:
   - Check `SEPAY_API_KEY` in backend `.env`
   - Verify API key is active in SePay dashboard

2. **Bank Account Not Found**:
   - Verify `SEPAY_BANK_ACCOUNT` and `SEPAY_BANK_CODE`
   - Check bank account is active in SePay dashboard

3. **Webhook Not Received**:
   - Verify webhook URL is publicly accessible
   - Check webhook is active in SePay dashboard
   - Review webhook logs in SePay dashboard

4. **Amount Mismatch**:
   - Ensure customer pays exact amount
   - Display amount clearly in VND format
   - Include payment instructions

### Debugging

Enable debug logging:

```typescript
this.logger.log(`Processing transaction: ${transaction.id}`);
this.logger.log(`Order ID: ${orderId}`);
this.logger.log(`Expected amount: ${expectedAmount}`);
this.logger.log(`Received amount: ${transaction.transferAmount}`);
```

## Testing

### Sandbox Environment

SePay provides a sandbox environment:

- Dashboard: https://my.sepay.vn
- Use test credentials for initial setup
- Test with small amounts

### Test Cases

1. **Successful Payment**:
   - Create payment
   - Simulate webhook
   - Verify license key allocation

2. **Duplicate Webhook**:
   - Send same webhook twice
   - Verify idempotency

3. **Invalid Amount**:
   - Send webhook with wrong amount
   - Verify rejection

4. **Invalid Signature**:
   - Send webhook without auth header
   - Verify rejection

## Monitoring

### Key Metrics

- Payment creation rate
- Webhook success rate
- Average processing time
- Failed payment reasons

### Alerts

Set up alerts for:
- High webhook failure rate
- Payment processing errors
- License key allocation failures
- Webhook signature verification failures

## Migration from Stripe

### Key Changes

1. **Payment Method**:
   - Stripe: Card payments via checkout session
   - SePay: QR code bank transfers

2. **Webhook Format**:
   - Stripe: Event-based with various types
   - SePay: Transaction-based with single type

3. **Currency**:
   - Stripe: Multi-currency (USD, EUR, etc.)
   - SePay: VND only

4. **Subscriptions**:
   - Stripe: Native subscription support
   - SePay: One-time payments only

### Database Changes

Update `Purchase` model:

```prisma
model Purchase {
  // Remove Stripe fields
  stripePaymentId     String?  @deprecated
  stripeSubscriptionId String? @deprecated
  stripeInvoiceId     String?  @deprecated

  // Add SePay fields
  sepayTransactionId  String?

  // Keep existing fields
  id                  String   @id @default(uuid())
  userId              String
  productId           String
  amount              Decimal
  currency            String   @default("VND")
  status              PurchaseStatus @default(PENDING)
  licenseKey          LicenseKey? @relation(fields: [licenseKeyId], references: [id])
  licenseKeyId        String?
  metadata            Json?
  createdAt           DateTime @default(now())
  completedAt         DateTime?
  refund              Refund?

  @@index([userId])
  @@index([productId])
  @@index([sepayTransactionId])
}
```

## Troubleshooting

### Issue: Webhook not received

**Solutions**:
- Verify webhook URL is accessible from internet
- Check firewall rules allow incoming requests
- Review SePay webhook logs

### Issue: Payment not completed

**Solutions**:
- Verify customer paid exact amount
- Check customer used correct content/description
- Review transaction in SePay dashboard

### Issue: License key not allocated

**Solutions**:
- Check available license keys inventory
- Review webhook processing logs
- Verify purchase status in database

## Support

- **SePay Docs**: https://developer.sepay.vn/en
- **SePay Email**: info@sepay.vn
- **SePay Hotline**: 02873059589 (24/7)
- **SePay GitHub**: https://github.com/sepayvn

## Future Enhancements

1. **Currency Conversion**:
   - Automatically convert USD to VND
   - Use real-time exchange rates

2. **Email Notifications**:
   - Send payment confirmation emails
   - Include license key in email

3. **Payment Status Polling**:
   - Automatically check payment status
   - Update UI without manual refresh

4. **Multiple Banks**:
   - Support multiple bank accounts
   - Allow customer to select bank

5. **Subscription Support**:
   - Implement manual renewal reminders
   - Support recurring bank transfers
