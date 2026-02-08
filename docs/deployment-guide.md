# Deployment Guide

This guide covers deploying the License Key Shop to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment (Railway)](#backend-deployment-railway)
- [Database Setup](#database-setup)
- [Monitoring Setup](#monitoring-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Rollback Procedure](#rollback-procedure)

## Prerequisites

Before deploying, ensure you have:

- GitHub repository access
- Vercel account ([vercel.com](https://vercel.com))
- Railway account ([railway.app](https://railway.app))
- Clerk account for authentication ([clerk.com](https://clerk.com))
- Stripe account for payments ([stripe.com](https://stripe.com))
- PostgreSQL and Redis databases (Railway or external)

## Environment Variables

### Frontend (.env.local)

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Stripe (for client-side checkout)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_URL=redis://user:password@host:6379

# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cryptography (CRITICAL - Generate secure keys)
HMAC_SECRET=your-random-64-character-secret-here
LICENSE_PRIVATE_KEY=your-ecdsa-private-key-here
LICENSE_PUBLIC_KEY=your-ecdsa-public-key-here

# JWT
JWT_SECRET=your-jwt-secret-here

# CORS
FRONTEND_URL=https://your-frontend.vercel.app

# Application
NODE_ENV=production
PORT=3001
```

### Generate Cryptographic Keys

```bash
# In apps/backend directory
pnpm generate-crypto-keys
```

This creates ECDSA-P256 keys for license signing.

## Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set root directory to `apps/frontend`

### Step 2: Configure Environment Variables

In Vercel project settings, add all frontend environment variables.

### Step 3: Deploy

1. Click "Deploy"
2. Vercel will automatically deploy on push to `main` branch
3. Access your app at `https://your-project.vercel.app`

### Step 4: Configure Custom Domain (Optional)

1. Go to project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

## Backend Deployment (Railway)

### Step 1: Connect Repository

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `apps/backend`

### Step 2: Add Databases

1. Click "New Service" > "Database" > "Add PostgreSQL"
2. Click "New Service" > "Database" > "Add Redis"
3. Copy connection URLs to environment variables

### Step 3: Configure Environment Variables

Add all backend environment variables in Railway project settings.

### Step 4: Configure Health Check

In Railway service settings, set health check path to `/health`

### Step 5: Deploy

Railway will auto-deploy on push to `main` branch.

## Database Setup

### Run Migrations

```bash
# In apps/backend directory
DATABASE_URL=your-production-url npx prisma migrate deploy
```

### Seed Data (Optional)

```bash
# Create admin user and sample products
DATABASE_URL=your-production-url npx prisma db seed
```

## Monitoring Setup

### Local Monitoring (Docker Compose)

Start monitoring stack:

```bash
docker-compose up -d prometheus grafana
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### Production Monitoring

For production, use managed services:

1. **Prometheus**: Use [Prometheus Cloud](https://prometheus.io/cloud/) or self-host
2. **Grafana**: Use [Grafana Cloud](https://grafana.com/products/cloud/)
3. **Error Tracking**: Set up [Sentry](https://sentry.io)

#### Import Grafana Dashboard

1. Go to Grafana > Dashboards > Import
2. Upload `infrastructure/monitoring/grafana-dashboard.json`
3. Select Prometheus datasource

#### Configure Alerts

1. Go to Alerting > Alert Rules
2. Import rules from `infrastructure/monitoring/alerts.yml`
3. Configure notification channels (email, Slack, PagerDuty)

## SSL/TLS Configuration

### Vercel (Frontend)

SSL is automatic with Vercel. Certificates auto-renew.

### Railway (Backend)

Railway provides automatic SSL for all services.

### Custom Domain SSL

For custom domains on your own infrastructure:

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d api.yourdomain.com
```

## Rollback Procedure

### Vercel Rollback

1. Go to Deployments tab
2. Click on previous deployment
3. Click "Promote to Production"

### Railway Rollback

1. Go to Deployments tab
2. Click "Redeploy" on previous commit
3. Or rollback to specific commit SHA

### Database Rollback

```bash
# Rollback to specific migration
npx prisma migrate resolve --rolled-back [migration-name]
```

## Health Checks

### Frontend Health

```bash
curl https://your-frontend.vercel.app
```

### Backend Health

```bash
curl https://your-backend.railway.app/health
```

### Database Health

```bash
# Check PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
redis-cli -u $REDIS_URL ping
```

## Performance Optimization

### Frontend

- Enable Vercel Analytics
- Configure image optimization
- Enable Edge Functions for static content

### Backend

- Enable compression (helmet)
- Configure Redis caching
- Use connection pooling for database
- Enable CDN for static assets

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SSL/TLS enforced
- [ ] Input validation on all endpoints
- [ ] Dependencies regularly updated
- [ ] Security headers configured (helmet)
- [ ] Webhook signatures verified
- [ ] API keys rotated regularly

## Troubleshooting

### Build Failures

1. Check build logs for errors
2. Verify all environment variables set
3. Ensure dependencies are up to date

### Runtime Errors

1. Check Railway/Vercel logs
2. Verify database connectivity
3. Check Redis connection
4. Validate environment variables

### Performance Issues

1. Check Grafana dashboards
2. Review database query performance
3. Check Redis cache hit rate
4. Monitor error rates in Sentry

## Scaling

### Horizontal Scaling

Backend is stateless and can scale horizontally:

1. Railway: Add more containers in settings
2. Or deploy to Kubernetes with provided manifests

### Vertical Scaling

Increase container resources:
- CPU: More cores for faster crypto operations
- Memory: More cache for better performance
- Database: Increase connection pool size

## Cost Optimization

1. **Database**: Use managed PostgreSQL with appropriate tier
2. **Redis**: Use Upstash free tier for low traffic
3. **CDN**: Vercel provides free CDN
4. **Monitoring**: Start with free tiers, upgrade as needed

## Support

For deployment issues:
1. Check logs first
2. Review this documentation
3. Open GitHub issue with:
   - Error messages
   - Logs
   - Environment (redact secrets)
   - Steps to reproduce
