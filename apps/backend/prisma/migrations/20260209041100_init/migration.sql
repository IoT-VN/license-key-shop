-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: products
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxActivations" INTEGER NOT NULL DEFAULT 1,
    "validityDays" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripePriceId" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable: license_keys
CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "keyString" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "KeyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchaseId" TEXT,
    "activations" INTEGER NOT NULL DEFAULT 0,
    "maxActivations" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: purchases
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripeSubscriptionId" TEXT,
    "sepayTransactionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable: transactions
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "stripeTxId" TEXT,
    "sepayTxId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: refunds
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "stripeRefundId" TEXT,
    "sepayRefundId" TEXT,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 10000,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: validation_logs
CREATE TABLE "validation_logs" (
    "id" TEXT NOT NULL,
    "licenseKeyId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "isValid" BOOLEAN NOT NULL,
    "validationReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: security_events
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "ipAddress" TEXT,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "products_stripePriceId_key" ON "products"("stripePriceId");
CREATE UNIQUE INDEX "license_keys_keyString_key" ON "license_keys"("keyString");
CREATE UNIQUE INDEX "license_keys_purchaseId_key" ON "license_keys"("purchaseId");
CREATE UNIQUE INDEX "purchases_stripePaymentId_key" ON "purchases"("stripePaymentId");
CREATE UNIQUE INDEX "purchases_sepayTransactionId_key" ON "purchases"("sepayTransactionId");
CREATE UNIQUE INDEX "refunds_purchaseId_key" ON "refunds"("purchaseId");
CREATE UNIQUE INDEX "refunds_stripeRefundId_key" ON "refunds"("stripeRefundId");
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");
CREATE INDEX "products_isActive_idx" ON "products"("isActive");
CREATE INDEX "license_keys_keyString_idx" ON "license_keys"("keyString");
CREATE INDEX "license_keys_productId_status_idx" ON "license_keys"("productId", "status");
CREATE INDEX "license_keys_purchaseId_idx" ON "license_keys"("purchaseId");
CREATE INDEX "purchases_userId_idx" ON "purchases"("userId");
CREATE INDEX "purchases_stripePaymentId_idx" ON "purchases"("stripePaymentId");
CREATE INDEX "purchases_sepayTransactionId_idx" ON "purchases"("sepayTransactionId");
CREATE INDEX "purchases_status_idx" ON "purchases"("status");
CREATE INDEX "purchases_stripeSubscriptionId_idx" ON "purchases"("stripeSubscriptionId");
CREATE INDEX "transactions_purchaseId_idx" ON "transactions"("purchaseId");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_isActive_idx" ON "api_keys"("isActive");
CREATE INDEX "validation_logs_licenseKeyId_idx" ON "validation_logs"("licenseKeyId");
CREATE INDEX "validation_logs_createdAt_idx" ON "validation_logs"("createdAt");
CREATE INDEX "validation_logs_apiKeyId_idx" ON "validation_logs"("apiKeyId");
CREATE INDEX "security_events_type_createdAt_idx" ON "security_events"("type", "createdAt");
CREATE INDEX "security_events_severity_idx" ON "security_events"("severity");
CREATE INDEX "security_events_ipAddress_idx" ON "security_events"("ipAddress");
CREATE INDEX "security_events_userId_idx" ON "security_events"("userId");

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "validation_logs" ADD CONSTRAINT "validation_logs_licenseKeyId_fkey" FOREIGN KEY ("licenseKeyId") REFERENCES "license_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_licenseKey_fkey" FOREIGN KEY ("licenseKey") REFERENCES "license_keys"("id");
