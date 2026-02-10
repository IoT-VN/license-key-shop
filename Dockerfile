# Build stage
ARG CACHEBUST=1
FROM node:20.20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.9

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile=false --ignore-scripts

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build backend
RUN pnpm --filter backend build

# Production stage
FROM node:20.20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.9

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile=false --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Generate Prisma client
RUN pnpm --filter backend prisma generate

WORKDIR /app/apps/backend

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy || npx prisma db push --accept-data-loss && node dist/main.js"]
