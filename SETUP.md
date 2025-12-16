# Dream Pixel - Setup Guide

Quick setup guide for getting Dream Pixel running locally and deploying to production.

## Development Setup

### Prerequisites

- Node.js 18+ (https://nodejs.org/)
- npm or yarn
- Git
- A code editor (VSCode recommended)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dream-pixel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your local values
   ```

4. **Setup database (Local PostgreSQL)**
   ```bash
   # Using Docker (recommended)
   docker run --name postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=dream_pixel_dev \
     -p 5432:5432 \
     -d postgres:15

   # Update .env.local
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dream_pixel_dev"
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:3000
   ```

### Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checker
npm run test             # Run Jest tests
npm run test:coverage    # Run tests with coverage
npm run prisma:studio    # Open Prisma Studio
```

## Production Setup

### Infrastructure Requirements

You'll need accounts with these services:

1. **Hosting**: Vercel (https://vercel.com)
2. **Database**: Supabase (https://supabase.com) or Neon (https://neon.tech)
3. **Redis**: Upstash (https://upstash.com)
4. **Storage**: AWS S3 or Cloudflare R2
5. **Error Tracking**: Sentry (https://sentry.io)
6. **Email**: Resend (https://resend.com)
7. **Payments**: Stripe (https://stripe.com)

### Quick Setup

1. **Create Supabase database**
   - Go to https://supabase.com
   - Create new project
   - Copy connection string

2. **Create Upstash Redis**
   - Go to https://upstash.com
   - Create Redis database
   - Copy REST credentials

3. **Create Sentry project**
   - Go to https://sentry.io
   - Create project → Next.js
   - Copy DSN and auth token

4. **Create S3 bucket**
   - Go to AWS Console
   - Create S3 bucket: `dream-pixel-images`
   - Enable versioning
   - Create IAM user with S3 access

5. **Setup Vercel**
   - Go to https://vercel.com
   - Import GitHub repository
   - Add environment variables
   - Connect to PostgreSQL

### Environment Variables for Production

See [.env.production.example](.env.production.example) for all variables.

Key variables to set in Vercel:

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=[generate with openssl]
JWT_SECRET=[generate with openssl]
SENTRY_DSN=https://...
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Generate secrets:
```bash
openssl rand -hex 32
```

### Deploy to Production

1. **Push to main branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions runs CI pipeline**
   - Linting
   - Type checking
   - Tests
   - Build verification

3. **Automatic deployment to Vercel**
   - Build production bundle
   - Deploy to Vercel
   - Create Sentry release
   - Run Lighthouse CI

4. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

### Verify Production

1. **Check deployment**
   - Go to Vercel dashboard
   - Verify successful deployment

2. **Test health endpoint**
   ```bash
   curl https://yourdomain.com/api/health
   ```

3. **Monitor in Sentry**
   - Go to https://sentry.io
   - Check for errors
   - Verify source maps uploaded

4. **Verify security headers**
   ```bash
   curl -I https://yourdomain.com
   # Should show HSTS and CSP headers
   ```

## Configuration Files

### .env.example
Main environment variable template. Copy and fill in values.

### .env.production.example
Production-specific variables. Reference only, don't commit.

### next.config.mjs
Next.js configuration with:
- Security headers
- Image optimization
- Bundle optimization
- Sentry integration

### vercel.json
Vercel-specific configuration:
- Build commands
- Environment variables
- Function settings

### jest.config.js
Jest testing configuration
- Next.js integration
- jsdom environment
- Coverage thresholds

### lighthouserc.json
Lighthouse CI configuration
- Performance targets
- Accessibility targets
- Number of runs

## CI/CD Pipeline

### GitHub Actions Workflows

Located in `.github/workflows/`:

1. **ci.yml** - Runs on every push and PR
   - Linting
   - Type checking
   - Tests
   - Build verification

2. **deployment.yml** - Runs on main branch push
   - Build production bundle
   - Deploy to Vercel
   - Create Sentry release
   - Database migrations

3. **security.yml** - Runs weekly and on push
   - Snyk vulnerability scan
   - npm audit
   - OWASP Dependency Check
   - Secret scanning

4. **lighthouse.yml** - Runs on main and PRs
   - Performance auditing
   - Accessibility checks
   - SEO validation

### GitHub Secrets

Set in GitHub → Settings → Secrets:

```
VERCEL_TOKEN          # Vercel API token
VERCEL_ORG_ID         # Vercel org ID
VERCEL_PROJECT_ID     # Vercel project ID
SENTRY_AUTH_TOKEN     # Sentry auth token
SENTRY_ORG            # Sentry org slug
SENTRY_PROJECT        # Sentry project slug
```

## Monitoring

### Health Check

```bash
GET /api/health
```

Response:
```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "database": { "status": "up|down", "responseTime": 10 },
    "redis": { "status": "up|down", "responseTime": 5 },
    "api": { "status": "up|down", "responseTime": 15 }
  }
}
```

### Sentry Dashboard

Monitor errors and performance:
- https://sentry.io/organizations/your-org/

### Vercel Dashboard

Monitor deployments:
- https://vercel.com/dashboard

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [MONITORING.md](./MONITORING.md) - Monitoring setup
- [SECURITY.md](./SECURITY.md) - Security guide
- [README_DEPLOYMENT.md](./README_DEPLOYMENT.md) - Deployment overview

## Troubleshooting

### Local Development

**Problem**: `DATABASE_URL not set`
- Solution: Add `DATABASE_URL` to `.env.local`

**Problem**: Database connection failed
- Solution: Verify PostgreSQL is running and connection string is correct

**Problem**: Module not found errors
- Solution: Run `npm install` and `npm run prisma:generate`

### Production

**Problem**: Build fails in Vercel
- Solution: Check build logs, verify environment variables

**Problem**: High error rate after deploy
- Solution: Check Sentry for errors, rollback if needed

**Problem**: Slow API responses
- Solution: Check database performance, add indexes

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [MONITORING.md](./MONITORING.md) for more troubleshooting.

## Support

- Documentation: Check [DEPLOYMENT.md](./DEPLOYMENT.md)
- Issues: Create GitHub issue
- Security: Email security@dream-pixel.app

---

**Last Updated**: 2024
