# CI/CD Setup Checklist

This checklist ensures all CI/CD components are properly configured before your first production deployment.

## Pre-Deployment Setup

### 1. GitHub Repository Configuration

- [ ] Repository created on GitHub
- [ ] Repository is public or organization members have access
- [ ] Default branch set to `main`
- [ ] Branch protection rules enabled for `main`:
  - [ ] Require pull request reviews
  - [ ] Dismiss stale pull request approvals
  - [ ] Require status checks to pass
  - [ ] Require branches to be up to date before merging
  - [ ] Include administrators in restrictions

### 2. GitHub Secrets Configuration

In GitHub → Settings → Secrets and variables → Actions, add:

- [ ] `VERCEL_TOKEN` - From Vercel dashboard
- [ ] `VERCEL_ORG_ID` - From Vercel dashboard
- [ ] `VERCEL_PROJECT_ID` - From Vercel dashboard
- [ ] `SENTRY_AUTH_TOKEN` - From Sentry settings
- [ ] `SENTRY_ORG` - Your Sentry organization slug
- [ ] `SENTRY_PROJECT` - Your Sentry project slug

**To get Vercel tokens:**
```bash
# Generate in Vercel dashboard:
# 1. Settings → Tokens
# 2. Create new token
# 3. Copy and add to GitHub
```

**To get Sentry tokens:**
```bash
# 1. Go to Sentry.io
# 2. Settings → Auth Tokens
# 3. Create new token with release permissions
# 4. Copy and add to GitHub
```

### 3. Vercel Configuration

- [ ] Project created in Vercel
- [ ] Connected to GitHub repository
- [ ] Environment variables set:
  - [ ] `DATABASE_URL`
  - [ ] `NEXTAUTH_SECRET` (min 32 chars)
  - [ ] `JWT_SECRET` (min 32 chars)
  - [ ] `NEXTAUTH_URL` (your domain)
  - [ ] `SENTRY_DSN`
  - [ ] `NEXT_PUBLIC_SENTRY_DSN`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `AWS_REGION`
  - [ ] `S3_BUCKET_NAME`
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`

- [ ] Production domain configured
- [ ] Custom domain SSL certificate verified
- [ ] Vercel Analytics enabled (optional)

### 4. Sentry Configuration

- [ ] Project created in Sentry
- [ ] Selected Next.js as platform
- [ ] Copied DSN (both public and private)
- [ ] Generated auth token with release permissions
- [ ] Organization and project slugs documented

**Sentry Organizations:**
```bash
# Test Sentry setup:
curl -H "Authorization: Bearer YOUR_SENTRY_AUTH_TOKEN" \
  https://sentry.io/api/0/organizations/YOUR_ORG/
```

### 5. Database Setup

- [ ] Supabase/Neon project created
- [ ] Connection string copied
- [ ] PostgreSQL database created
- [ ] SSL mode enabled

**Test connection:**
```bash
psql "your-database-url"
```

### 6. Redis Setup (Upstash)

- [ ] Upstash Redis database created
- [ ] REST API credentials copied
- [ ] Region selected (closest to deployment)

**Test connection:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://YOUR_REGION.upstash.io/ping
```

### 7. S3/R2 Storage Setup

**Option A: AWS S3**

- [ ] S3 bucket created: `dream-pixel-images`
- [ ] Versioning enabled
- [ ] IAM user created with S3 permissions
- [ ] Access key and secret key copied
- [ ] Bucket policy configured for CORS (if needed)

**Option B: Cloudflare R2**

- [ ] R2 bucket created
- [ ] API token generated with Editor permissions
- [ ] Custom domain configured
- [ ] CORS rules configured (if needed)

### 8. Email Setup (Resend)

- [ ] Resend account created
- [ ] API key generated
- [ ] Domain verified (if using custom domain)
- [ ] Email templates created

### 9. Payment Setup (Stripe)

- [ ] Stripe account created
- [ ] Test/Live keys copied
- [ ] Webhook endpoint configured: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Webhook events enabled:
  - [ ] `payment_intent.succeeded`
  - [ ] `charge.failed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`

**Test Stripe webhook:**
```bash
curl -X POST https://yourdomain.com/api/webhooks/stripe \
  -H "stripe-signature: whsec_..." \
  -d '{...event payload...}'
```

## Verification Steps

### 1. Local Verification

```bash
# Install dependencies
npm install

# Type checking
npm run type-check
# Expected: No errors

# Linting
npm run lint
# Expected: No errors

# Build
npm run build
# Expected: Build successful, no warnings

# Run tests
npm run test
# Expected: All tests pass

# Start locally
npm run dev
# Expected: Server runs on http://localhost:3000
```

### 2. GitHub Actions Verification

After pushing code:

1. Go to GitHub → Actions
2. Verify CI pipeline runs:
   - [ ] Lint step passes
   - [ ] Type check step passes
   - [ ] Test step passes
   - [ ] Build step passes
3. Check workflow logs for errors

### 3. Vercel Deployment Verification

After successful CI:

1. Check Vercel dashboard
2. Verify deployment succeeded
3. Check preview deployment logs
4. Test preview URL

### 4. Production Deployment Verification

After deployment:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health
# Expected: 200 status, healthy status

# Check security headers
curl -I https://yourdomain.com
# Expected: HSTS, CSP, X-Frame-Options headers present

# Check Sentry
# 1. Go to Sentry dashboard
# 2. Verify new release created
# 3. Verify source maps uploaded
```

## Post-Deployment Checklist

### Immediate (First Hour)

- [ ] Health check endpoint responding
- [ ] No critical errors in Sentry
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Images uploading correctly
- [ ] Email sending (test email)
- [ ] Payments processing (test transaction)

### Short Term (First Day)

- [ ] Monitor error rates in Sentry
- [ ] Check Web Vitals in Sentry
- [ ] Verify database backups
- [ ] Test database restore
- [ ] Verify log aggregation

### Ongoing (Weekly)

- [ ] Review Sentry error reports
- [ ] Check Lighthouse scores
- [ ] Verify API latency
- [ ] Check error rate trends
- [ ] Review security logs

## Rollback Procedure

If deployment needs to be rolled back:

1. Go to Vercel dashboard
2. Find last known good deployment
3. Click "Redeploy"
4. Wait for deployment to complete
5. Verify health check
6. Monitor Sentry for issues

## Troubleshooting

### CI Pipeline Fails

**Linting errors:**
```bash
npm run lint -- --fix
git add .
git commit -m "fix: lint errors"
git push
```

**Type checking errors:**
```bash
npm run type-check
# Fix errors and commit
```

**Build fails:**
```bash
npm run build
# Check error messages
# Common: Missing environment variables, TypeScript errors
```

**Tests fail:**
```bash
npm run test
# Check test output
# Update tests if behavior changed intentionally
```

### Vercel Deployment Fails

1. Check Vercel build logs
2. Verify environment variables
3. Check if Sentry token is valid
4. Verify database connection
5. Try manual redeployment

### Sentry Not Receiving Errors

1. Verify DSN is correct
2. Check browser console for Sentry errors
3. Verify environment is production
4. Check NEXT_PUBLIC_SENTRY_DSN in client
5. Check SENTRY_DSN in server

## Environment Variables Validation

Quick validation script:

```bash
# Check all required variables are set
npm run validate-env

# Or manually:
node -e "
const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET'];
const missing = required.filter(v => !process.env[v]);
console.log(missing.length ? '❌ Missing: ' + missing.join(', ') : '✅ All required vars set');
"
```

## Monitoring Setup

### Sentry Alerts

Create alert rule:
1. Sentry → Alerts → Create Alert Rule
2. Condition: Event count is 10 or more in 5 minutes
3. Action: Send to email
4. Save alert

### Uptime Monitoring

1. Create account at https://betteruptime.com
2. Add monitor: `https://yourdomain.com/api/health`
3. Check interval: 5 minutes
4. Alerting: Email/SMS

### Status Page

1. Create status page at https://www.statuspage.io
2. Add components: API, Database, Storage
3. Link to your domain
4. Integrate with Sentry for automatic updates

## Performance Benchmarks

Target metrics after deployment:

| Metric | Target | Status |
|--------|--------|--------|
| Lighthouse Performance | > 90 | ☐ |
| Lighthouse Accessibility | > 90 | ☐ |
| Lighthouse Best Practices | > 90 | ☐ |
| API Latency (p95) | < 2s | ☐ |
| Error Rate | < 1% | ☐ |
| Database Query Time | < 500ms | ☐ |
| Build Time | < 5 minutes | ☐ |
| Time to Interactive | < 3.8s | ☐ |

## Security Verification

- [ ] HTTPS enforced (HSTS header present)
- [ ] CSP header configured
- [ ] CORS properly configured
- [ ] Rate limiting functional
- [ ] Database has RLS policies
- [ ] API keys not in logs
- [ ] Sensitive data not in error messages
- [ ] Dependencies security scanned

## Final Checklist

- [ ] All environment variables configured
- [ ] CI/CD pipeline passing
- [ ] Deployment successful
- [ ] Health check responding
- [ ] Sentry receiving errors
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Security verified
- [ ] Performance benchmarks met
- [ ] Team trained on procedures

---

**Status**: Ready for Production
**Last Checked**: [Date]
**Checked By**: [Name]

For issues or questions, refer to DEPLOYMENT.md or contact the DevOps team.
