# Dream Pixel - Production Deployment Guide

This guide provides step-by-step instructions for deploying Dream Pixel to production with complete CI/CD, monitoring, and security configurations.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Environment Configuration](#environment-configuration)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Deployment Steps](#deployment-steps)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview

The Dream Pixel platform uses a modern serverless architecture with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                          │
│              (DDoS Protection, Caching)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Vercel (Next.js)                         │
│         (Edge Functions, Serverless Functions)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────┴─────┐  ┌─────┴──────┐  ┌──┴──────────┐
│ Supabase    │  │ Upstash    │  │ AWS S3 /   │
│ PostgreSQL  │  │ Redis      │  │ Cloudflare │
│             │  │            │  │ R2         │
└─────────────┘  └────────────┘  └────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                  Sentry (Error Tracking)                    │
└──────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before starting the deployment process, ensure you have:

- [ ] GitHub repository created and code pushed
- [ ] Vercel account (for hosting)
- [ ] Supabase or Neon account (for PostgreSQL)
- [ ] Upstash account (for Redis)
- [ ] AWS account or Cloudflare account (for S3/R2 storage)
- [ ] Sentry account (for error tracking)
- [ ] Stripe account (for payments)
- [ ] Resend account (for emails)
- [ ] GitHub tokens and secrets configured

## Infrastructure Setup

### 1. Supabase/PostgreSQL Setup

**Steps:**

1. Create a Supabase project at https://supabase.com
2. Copy the connection string from Project Settings → Database
3. Create backups:
   - Enable automatic backups in Supabase dashboard
   - Set retention to 30 days
4. Enable SSL connection: Required for production

**Connection String Format:**
```
postgresql://postgres:[password]@[host].supabase.co:5432/postgres?sslmode=require
```

### 2. Upstash Redis Setup

**Steps:**

1. Create an Upstash Redis database at https://upstash.com
2. Copy REST API credentials from dashboard
3. Enable replication for high availability
4. Set automatic eviction policy

**Environment Variables:**
```
UPSTASH_REDIS_REST_URL=https://[region].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]
```

### 3. AWS S3 / Cloudflare R2 Setup

**Option A: AWS S3**

1. Create an S3 bucket: `dream-pixel-images`
2. Enable versioning: Bucket → Properties → Versioning
3. Create IAM user with S3 access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::dream-pixel-images",
           "arn:aws:s3:::dream-pixel-images/*"
         ]
       }
     ]
   }
   ```
4. Enable CloudFront distribution for CDN

**Option B: Cloudflare R2**

1. Create R2 bucket at https://dash.cloudflare.com
2. Get R2 API token with Editor permissions
3. Create custom domain for bucket
4. Enable Cloudflare caching

**Lifecycle Policy (S3):**
```json
{
  "Rules": [
    {
      "Id": "DeleteUnreferencedImages",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "uploads/"
      },
      "Expiration": {
        "Days": 1
      }
    },
    {
      "Id": "ArchiveOldImages",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "generations/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### 4. Cloudflare Setup (DDoS Protection & CDN)

**Steps:**

1. Add domain to Cloudflare
2. Update nameservers at domain registrar
3. Configure SSL/TLS: Full (strict)
4. Enable caching rules
5. Set cache level to Cache Everything
6. Enable Brotli compression
7. Add security rules

**Security Rules:**
```
(cf.threat_score > 50) OR (cf.bot_management.score < 30)
→ Challenge
```

### 5. Sentry Setup (Error Tracking)

**Steps:**

1. Create Sentry project at https://sentry.io
2. Select Next.js as platform
3. Copy DSN and Auth Token
4. Create Release: https://docs.sentry.io/product/releases/

**Sentry Environment Variables:**
```
SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[project-id]
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[project-id]
SENTRY_AUTH_TOKEN=[token]
SENTRY_ORG=your-org
SENTRY_PROJECT=dream-pixel
```

### 6. Stripe Setup (Payments)

**Steps:**

1. Create Stripe account at https://stripe.com
2. Enable email verification
3. Copy API keys from Dashboard
4. Create webhook endpoints:
   - `https://yourdomain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `charge.failed`, `customer.subscription.*`

### 7. Resend Setup (Email)

**Steps:**

1. Create Resend account at https://resend.com
2. Verify domain
3. Copy API key
4. Create email templates

## Environment Configuration

### 1. Create Environment Variables

Create a `.env.production` file with all variables from `.env.example`:

```bash
# Copy template
cp .env.example .env.production

# Edit and fill in all values
nano .env.production
```

### 2. Vercel Environment Setup

1. Connect GitHub repository to Vercel
2. In Vercel Dashboard → Settings → Environment Variables:
   - Add all environment variables from `.env.production`
   - Set appropriate environment (Production, Preview, Development)

**Critical Production Variables:**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=[32+ char random string]
JWT_SECRET=[32+ char random string]
SENTRY_DSN=https://...
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### 3. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## CI/CD Pipeline

### 1. GitHub Actions Setup

The CI/CD pipeline includes:

- **Lint & Type Check**: ESLint and TypeScript validation
- **Tests**: Jest with coverage reporting
- **Build**: Next.js production build
- **Lighthouse**: Performance audit
- **Deploy**: Automatic deployment to Vercel
- **Sentry Release**: Create Sentry releases with source maps

### 2. GitHub Secrets Configuration

In GitHub → Settings → Secrets and variables → Actions, add:

```
VERCEL_TOKEN=[Vercel API token]
VERCEL_ORG_ID=[Vercel org ID]
VERCEL_PROJECT_ID=[Vercel project ID]
SENTRY_AUTH_TOKEN=[Sentry auth token]
SENTRY_ORG=[Sentry org slug]
SENTRY_PROJECT=[Sentry project slug]
SNYK_TOKEN=[Snyk token - optional]
```

### 3. Workflow Triggers

- **CI Pipeline**: Triggered on push to main/develop and pull requests
- **Deployment**: Triggered on push to main (after CI passes)
- **Security Checks**: Runs weekly and on all branches
- **Lighthouse**: Runs on push to main and pull requests

## Deployment Steps

### Step 1: Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/dream-pixel.git
cd dream-pixel

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

### Step 2: Database Setup

```bash
# Run migrations on Supabase
npx prisma migrate deploy

# Seed initial data (if available)
npx prisma db seed
```

### Step 3: Verify Build Locally

```bash
# Build for production
npm run build

# Start production server
npm run start

# Should be accessible at http://localhost:3000
```

### Step 4: Deploy to Vercel

**Option A: Via CLI**

```bash
npm install -g vercel

# Link to Vercel project
vercel link

# Deploy
vercel --prod
```

**Option B: Via GitHub Integration**

1. Push to main branch
2. GitHub Actions CI pipeline runs
3. Automatic deployment to Vercel
4. Sentry release created automatically

### Step 5: Verify Deployment

```bash
# Check Vercel deployment status
vercel list

# View logs
vercel logs [deployment-url]

# Check health endpoint
curl https://yourdomain.com/api/health
```

### Step 6: Configure DNS

Update your domain DNS records:

```
CNAME  www   yourdomain-vercel.vercel.app
CNAME  api   yourdomain-vercel.vercel.app
```

Or use Vercel nameservers for full domain delegation.

## Monitoring & Alerts

### 1. Sentry Configuration

**Setup Alerts:**

1. Sentry Dashboard → Alerts → Create Alert Rule
2. Conditions:
   - Error rate > 1%
   - New issues
   - Regressed performance
3. Actions: Send to email or Slack

**Configure Source Maps:**

Already configured in `next.config.mjs` and GitHub Actions workflow.

### 2. Web Vitals Monitoring

Web Vitals are automatically sent to Sentry. Monitor:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### 3. Database Monitoring

For Supabase:

1. Dashboard → Logs → Database
2. Monitor slow queries
3. Set up alerts for connection issues

### 4. API Performance Monitoring

All API endpoints are automatically tracked in Sentry. Monitor:

- API response times
- Error rates
- Endpoint-specific issues

### 5. Uptime Monitoring (Optional)

Using Better Uptime or Pingdom:

1. Create monitor for `https://yourdomain.com/api/health`
2. Check interval: 5 minutes
3. Alerting: Email on downtime

## Security Configuration

### 1. Enable HTTPS

✅ Automatically enabled on Vercel with free SSL

### 2. Security Headers

✅ Already configured in `next.config.mjs`:

- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy

Verify headers:

```bash
curl -I https://yourdomain.com
```

### 3. Rate Limiting

✅ Configured in `middleware.ts`:

- 100 requests per 15 minutes per IP
- Applied to public API endpoints

### 4. DDoS Protection

✅ Enabled via Cloudflare:

1. Cloudflare Dashboard → Security → DDoS Protection
2. Sensitivity: High
3. Challenge threshold: Automatically managed

### 5. Dependency Updates

Enable Dependabot for automatic dependency updates:

1. GitHub → Settings → Code security and analysis
2. Enable Dependabot alerts
3. Configure auto-merge for patch updates

### 6. Security Scanning

The security workflow runs:

- npm audit
- Snyk vulnerability scan
- OWASP Dependency Check
- Secret scanning via TruffleHog

## Performance Optimization

### 1. Image Optimization

✅ Configured:

- Next.js Image component with responsive sizing
- WebP/AVIF format support
- Lazy loading with LQIP
- Cloudflare image optimization

### 2. Bundle Analysis

Check bundle size:

```bash
npm run build
# Check .next/static folder size
du -sh .next
```

Target: < 200KB gzipped

### 3. Database Optimization

For Supabase:

1. Create indexes on frequently queried columns
2. Enable query analysis tools
3. Monitor slow queries

Recommended indexes:

```sql
-- User queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_id ON users(stripe_id);

-- Generation queries
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);

-- Image queries
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_generation_id ON images(generation_id);
```

### 4. Caching Strategy

✅ Configured:

- Static assets: 1 year cache
- Generated images: 1 year cache
- Reference images: 24 hour cache
- API responses: no-store, must-revalidate

### 5. Redis Caching

✅ Configured with Upstash:

- Session caching
- Rate limiting
- Database query caching

## Troubleshooting

### Build Failures

**Error: `Failed to build`**

1. Check Sentry configuration:
   ```bash
   unset SENTRY_AUTH_TOKEN
   npm run build
   ```

2. Verify environment variables in Vercel
3. Check for TypeScript errors:
   ```bash
   npm run type-check
   ```

### Deployment Issues

**Vercel Deployment Stuck**

1. Check build logs: Vercel Dashboard → Deployments
2. Cancel failed deployment
3. Re-deploy: `vercel --prod`

**Database Connection Errors**

1. Verify DATABASE_URL is correct
2. Check IP whitelist in Supabase
3. Run migrations: `npx prisma migrate deploy`

### Performance Issues

**Slow API Responses**

1. Check database slow query logs
2. Add missing indexes (see above)
3. Review Sentry performance monitoring

**High Memory Usage**

1. Check for memory leaks in Sentry
2. Monitor serverless function duration
3. Review Upstash Redis usage

### Security Warnings

**Dependency Vulnerabilities**

1. Run `npm audit`
2. Update vulnerable packages:
   ```bash
   npm update [package-name]
   ```
3. Review breaking changes in changelogs

**Failed Security Checks**

1. Fix issues reported by Snyk
2. Verify CSP headers allow necessary domains
3. Check CORS configuration

## Post-Deployment Checklist

- [ ] Verify HTTPS and security headers
- [ ] Test authentication flow (signup, login, logout)
- [ ] Verify email sending (check Resend logs)
- [ ] Test payment processing (Stripe test mode)
- [ ] Monitor Sentry for errors
- [ ] Check Web Vitals in Sentry
- [ ] Verify database backups are scheduled
- [ ] Test image upload and processing
- [ ] Monitor CI/CD pipeline runs
- [ ] Check CDN caching headers
- [ ] Verify rate limiting is working
- [ ] Test database migration process

## Rollback Procedure

If deployment fails:

1. Check Vercel deployment logs
2. Previous deployment is available in Vercel dashboard
3. Click "Redeploy" on previous stable deployment
4. If database migration failed:
   - Use Supabase backup to restore
   - Or manually run migration rollback:
     ```bash
     npx prisma migrate resolve --rolled-back <migration-name>
     ```

## Monitoring Dashboard

Create a monitoring dashboard aggregating:

1. **Vercel Dashboard**: Deployment status, logs
2. **Sentry Dashboard**: Error rates, performance
3. **Supabase Dashboard**: Database performance
4. **Upstash Dashboard**: Redis memory usage
5. **Stripe Dashboard**: Payment metrics
6. **Cloudflare Dashboard**: CDN statistics

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Sentry Docs: https://docs.sentry.io
- Prisma Docs: https://www.prisma.io/docs
- Supabase Docs: https://supabase.com/docs

## Maintenance Tasks

### Weekly

- [ ] Review Sentry error reports
- [ ] Check Web Vitals metrics
- [ ] Verify scheduled cleanup jobs

### Monthly

- [ ] Review and optimize database queries
- [ ] Analyze bundle size changes
- [ ] Update npm dependencies
- [ ] Verify backup integrity

### Quarterly

- [ ] Database performance tuning
- [ ] Security audit of dependencies
- [ ] Review and optimize caching strategy
- [ ] Cost analysis of infrastructure

---

**Last Updated**: 2024
**Maintenance**: DevOps Team
