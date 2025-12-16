# Dream Pixel - Complete Deployment & CI/CD Setup

This document provides an overview of the complete production deployment pipeline for Dream Pixel.

## Quick Start

### For Developers

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

### For DevOps/Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production setup instructions.

## What's Included

### ✅ CI/CD Pipeline (GitHub Actions)

**Workflows:**
- `ci.yml` - ESLint, TypeScript, Tests, Build on push/PR
- `deployment.yml` - Automatic deployment to Vercel
- `security.yml` - Security scanning (Snyk, npm audit, CodeQL)
- `lighthouse.yml` - Performance auditing with Lighthouse

**Features:**
- ✓ Concurrent job execution for speed
- ✓ Automatic source map uploads to Sentry
- ✓ Performance monitoring with Lighthouse CI
- ✓ Database migrations on deploy
- ✓ Pull request status checks

### ✅ Monitoring & Error Tracking

**Sentry Integration:**
- Client-side error tracking with replay
- Server-side error tracking
- Performance monitoring
- Source map uploads
- Release tracking
- 10% performance sample rate

**Health Check:**
- `/api/health` endpoint
- Database connectivity check
- Redis connectivity check
- Response time tracking

**Logging:**
- Structured JSON logging
- Log levels (error, warn, info, debug)
- Sentry integration for errors
- Performance metrics tracking

### ✅ Security Headers & Protection

**HTTP Headers:**
- HSTS (HTTP Strict Transport Security)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- CSP (Content Security Policy)
- Referrer-Policy
- Permissions-Policy

**Rate Limiting:**
- Per-IP rate limiting on public endpoints
- 100 requests per 15 minutes
- Configurable via environment variables

**DDoS Protection:**
- Cloudflare integration
- Bot management
- Automatic mitigation

### ✅ Performance Optimization

**Next.js Configuration:**
- SWC minification
- Image optimization with AVIF/WebP
- Bundle splitting
- Responsive image sizes
- Automatic static optimization

**Caching Strategy:**
- Static assets: 1 year cache
- Generated images: 1 year cache
- API responses: no-store
- Reference images: 24-hour cache

### ✅ Environment Configuration

**Complete `.env.example`:**
- Database (Supabase/Neon)
- Authentication (NextAuth, OAuth)
- Payment (Stripe)
- Email (Resend)
- Storage (S3/R2)
- Monitoring (Sentry)
- Analytics (PostHog)
- Caching (Upstash Redis)

**Separate Production File:**
- `.env.production.example` for reference
- All sensitive values documented
- Vercel dashboard integration

## Directory Structure

```
project/
├── .github/
│   └── workflows/              # GitHub Actions workflows
│       ├── ci.yml              # CI pipeline
│       ├── deployment.yml       # Deployment pipeline
│       ├── security.yml         # Security scanning
│       └── lighthouse.yml       # Performance auditing
├── app/
│   ├── api/                     # API routes
│   │   ├── health/              # Health check
│   │   ├── auth/                # Authentication
│   │   ├── images/              # Image processing
│   │   └── ...
│   ├── layout.tsx               # Root layout with Sentry
│   └── page.tsx                 # Home page
├── lib/
│   ├── logger.ts                # Structured logging
│   ├── monitoring.ts            # Performance monitoring
│   ├── web-vitals.ts            # Web Vitals tracking
│   └── ...                      # Other utilities
├── __tests__/                   # Jest test files
├── .env.example                 # Environment template
├── .env.production.example      # Production template
├── .gitignore                   # Git ignore rules
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup
├── lighthouserc.json            # Lighthouse CI config
├── next.config.mjs              # Next.js config with security & monitoring
├── sentry.client.config.ts      # Sentry client config
├── sentry.server.config.ts      # Sentry server config
├── vercel.json                  # Vercel configuration
├── DEPLOYMENT.md                # Deployment guide
├── MONITORING.md                # Monitoring guide
├── SECURITY.md                  # Security guide
└── package.json                 # Dependencies & scripts
```

## Configuration Files

### next.config.mjs
- Image optimization with AVIF/WebP support
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Bundle optimization with SWC
- Sentry integration via `withSentryConfig`
- Environment variable configuration

### vercel.json
- Build and install commands
- Function runtime and memory configuration
- Environment variable whitelisting
- Rewrite rules for Sentry monitoring tunnel

### lighthouserc.json
- Performance targets > 90%
- Accessibility targets > 90%
- Best practices targets > 90%
- 3-run average for consistency

### jest.config.js
- Next.js integration
- Path aliases (@/)
- jsdom test environment
- Coverage thresholds (50%)

## GitHub Secrets Required

Set these in your GitHub repository settings:

```
VERCEL_TOKEN           # Vercel API token
VERCEL_ORG_ID          # Vercel organization ID
VERCEL_PROJECT_ID      # Vercel project ID
SENTRY_AUTH_TOKEN      # Sentry authentication token
SENTRY_ORG             # Sentry organization slug
SENTRY_PROJECT         # Sentry project slug
SNYK_TOKEN             # Snyk API token (optional)
```

## Deployment Process

### Automatic Deployment

1. **Push to main branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions triggers CI pipeline**
   - Linting
   - Type checking
   - Tests
   - Build verification

3. **On CI success, deployment pipeline runs**
   - Build production bundle
   - Run Lighthouse CI
   - Deploy to Vercel
   - Create Sentry release
   - Upload source maps

4. **Automatic database migrations**
   - Manually trigger via Vercel dashboard
   - Or run: `npx prisma migrate deploy`

### Manual Deployment (if needed)

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Deploy to production
vercel --prod
```

## Monitoring & Alerts

### Sentry Dashboard
- **URL**: https://sentry.io/organizations/your-org/
- **Monitor**: Error rates, performance, user sessions
- **Alerts**: Email, Slack, PagerDuty

### Vercel Dashboard
- **URL**: https://vercel.com/dashboard
- **Monitor**: Deployment status, logs, analytics
- **Rollback**: Available for all previous deployments

### Health Check
```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "up", "responseTime": 10 },
    "redis": { "status": "up", "responseTime": 5 },
    "api": { "status": "up", "responseTime": 15 }
  }
}
```

## Security Measures

### Headers
- ✓ HSTS with preload
- ✓ CSP with strict policy
- ✓ Clickjacking protection
- ✓ MIME type sniffing protection

### Rate Limiting
- ✓ Per-IP limiting (100 req/15min)
- ✓ Applied to auth endpoints
- ✓ Configurable thresholds

### Dependencies
- ✓ Weekly Dependabot scans
- ✓ Snyk vulnerability scanning
- ✓ npm audit before deploy
- ✓ CodeQL analysis

### Secrets
- ✓ Never committed to repo
- ✓ Stored in Vercel dashboard
- ✓ GitHub Actions secrets
- ✓ Environment-specific values

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Lighthouse Performance | > 90 | TBD |
| Lighthouse Accessibility | > 90 | TBD |
| API Latency (p95) | < 2s | TBD |
| Database Query | < 500ms | TBD |
| Error Rate | < 1% | TBD |

## Troubleshooting

### Build Fails
1. Check Sentry configuration
2. Verify environment variables in Vercel
3. Run `npm run type-check` locally

### Deployment Stuck
1. View logs in Vercel dashboard
2. Cancel and retry deployment
3. Check for resource limits

### Performance Issues
1. Check Web Vitals in Sentry
2. Review database slow queries
3. Analyze API response times

### High Error Rate
1. Check Sentry for new errors
2. Review recent deployments
3. Check third-party service status

## Additional Resources

- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Monitoring**: See [MONITORING.md](./MONITORING.md)
- **Security**: See [SECURITY.md](./SECURITY.md)
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Sentry Docs**: https://docs.sentry.io

## Support

For deployment issues, contact the DevOps team or open an issue in GitHub.

---

**Last Updated**: 2024
**Maintained By**: DevOps Team
