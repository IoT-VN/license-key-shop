# License Key Shop

Full-stack license key shop application with payment processing, user authentication, and public validation API.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Backend**: NestJS (Node.js, TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe (checkout, subscriptions, webhooks)
- **Authentication**: Clerk
- **Caching**: Redis (rate limiting, session caching)
- **Key Generation**: ECDSA-P256 + HMAC-SHA256
- **Testing**: Jest, Playwright
- **Deployment**: Vercel (frontend) + Railway (backend)

## Project Structure

```
license-key-shop/
├── apps/
│   ├── frontend/          # Next.js 14+ App
│   │   ├── app/           # App Router
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   └── public/        # Static assets
│   └── backend/           # NestJS API
│       ├── src/
│       │   ├── modules/   # Feature modules
│       │   ├── common/    # Shared code
│       │   └── main.ts
│       └── prisma/        # Database schema
├── packages/
│   ├── shared/            # Shared types
│   └── config/            # Shared configs
└── infrastructure/
    └── docker/            # Docker configs
```

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- pnpm 8+
- PostgreSQL 16
- Redis 7+

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd license-key-shop
   pnpm install
   ```

2. **Set up environment variables**:

   Frontend (`.env.local`):
   ```bash
   cp apps/frontend/.env.example apps/frontend/.env.local
   ```

   Backend (`.env`):
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

   Update with your actual credentials (Clerk, Stripe, database URLs).

3. **Set up database**:

   **Option A: Using Docker (Recommended for local dev)**
   ```bash
   docker compose up -d postgres redis
   ```

   **Option B: Using Railway (Quick cloud setup)**
   - Create PostgreSQL and Redis databases on Railway
   - Copy connection URLs to `.env` files

   **Option C: Local installation**
   - Install PostgreSQL 16 and Redis 7 locally
   - Update DATABASE_URL and REDIS_URL in `.env`

4. **Run Prisma migrations**:
   ```bash
   cd apps/backend
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development servers**:
   ```bash
   # From root
   pnpm dev

   # Or separately:
   pnpm dev:frontend  # http://localhost:3000
   pnpm dev:backend   # http://localhost:3001
   ```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services (frontend + backend) |
| `pnpm dev:frontend` | Start Next.js frontend only |
| `pnpm dev:backend` | Start NestJS backend only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all code |
| `pnpm test` | Run backend unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm format` | Format all code with Prettier |

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Reset database (DEV ONLY)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `apps/frontend`
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Backend (Railway)

1. Connect your GitHub repository to Railway
2. Set root directory to `apps/backend`
3. Configure environment variables in Railway dashboard
4. Railway will build using `Dockerfile`
5. Deploy automatically on push to main branch

### Manual Deployment

See deployment configs:
- Frontend: `apps/frontend/vercel.json`
- Backend: `apps/backend/railway.json` + `apps/backend/Dockerfile`

## Features

### Core Features
- ✅ License key generation with ECDSA-P256 cryptography
- ✅ Stripe payment processing (one-time & subscriptions)
- ✅ Clerk authentication
- ✅ User dashboard with purchase history
- ✅ Public API for license key validation
- ✅ Rate limiting (10,000 requests/hour, adjustable)
- ✅ Invoice generation
- ✅ Refund processing

### Security Features
- ✅ HSM/KMS for key storage (production)
- ✅ HMAC-SHA256 integrity verification
- ✅ API key authentication
- ✅ Redis-based rate limiting
- ✅ Webhook signature verification
- ✅ GDPR compliance features

## Documentation

- [Implementation Plan](./plans/260207-1358-license-key-shop-architecture/plan.md)
- [Phase Documentation](./plans/260207-1358-license-key-shop-architecture/)
- [Research Reports](./plans/260207-1358-license-key-shop-architecture/research/)

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
