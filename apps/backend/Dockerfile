# Build stage - access monorepo from backend context
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.15.9

# Copy monorepo root files from parent directories
COPY ../../package.json ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ./
COPY ../../packages/shared/package.json ./packages/shared/
COPY package.json ./

# Install all dependencies (including workspace packages)
RUN pnpm install --frozen-lockfile

# Copy source code from parent directories and current directory
COPY ../../packages/shared ./packages/shared
COPY . ./

# Build shared package first
RUN pnpm --filter @license-key-shop/shared build

# Generate Prisma client and build backend
RUN cd apps/backend && \
    npx prisma generate && \
    pnpm run build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@8.15.9

# Copy monorepo root files from parent directories
COPY ../../package.json ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ./
COPY ../../packages/shared/package.json ./packages/shared/
COPY package.json ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set working directory to app root
WORKDIR /app

# Expose port
ENV PORT=3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
