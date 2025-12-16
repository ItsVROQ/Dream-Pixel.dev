# Security Policy

## Overview

Dream Pixel implements comprehensive security measures to protect user data, prevent attacks, and ensure safe operations in production.

## Security Architecture

### 1. Authentication & Authorization

**Implementation:**
- NextAuth.js for session management
- OAuth 2.0 integration with Google and GitHub
- JWT tokens with 32+ character secrets
- Email verification required for protected routes
- Secure password hashing with bcryptjs

**Best Practices:**
```typescript
// Good: Using authenticated endpoints
const protectedRoutes = ['/api/generations', '/api/profile']
// Only authenticated users can access
```

### 2. Encryption

**In Transit:**
- TLS 1.2+ enforced via HSTS headers
- All API endpoints require HTTPS in production
- 1-year HSTS preload with includeSubDomains

**At Rest:**
- Database passwords stored securely in Supabase vault
- S3 bucket encryption enabled (AES-256)
- API keys never committed to repository (use .env files)

### 3. Transport Security Headers

All responses include security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [restrictive policy]
```

### 4. Content Security Policy (CSP)

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.com *.sentry.io
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' data:
connect-src 'self' *.sentry.io *.vercel.com https:
frame-ancestors 'none'
```

**Explanation:**
- Default: Only load resources from same origin
- Scripts: Allow self, inline (for Next.js), and monitoring services
- Images: Allow self, data URLs, and HTTPS
- Frames: Prevent clickjacking by disallowing iframe embedding

### 5. Rate Limiting

**Implementation:**
- Per-IP rate limiting on all public endpoints
- 100 requests per 15 minutes per IP
- Redis-backed for distributed systems

**Protected Endpoints:**
- `/api/auth/signup` - Prevent account enumeration
- `/api/auth/signin` - Prevent brute force attacks
- `/api/auth/forgot-password` - Prevent email enumeration
- `/api/health` - Prevent DDoS attacks

### 6. DDoS Protection

**Cloudflare Configuration:**
- Automatic DDoS mitigation
- Bot management enabled
- Challenge threshold: High
- Rate limiting at edge

### 7. Database Security

**Supabase Best Practices:**
- Row-level security (RLS) policies enabled
- Principle of least privilege for database roles
- Automatic backups with 30-day retention
- Point-in-time recovery enabled
- IP whitelist for Vercel deployment

**Example RLS Policy:**
```sql
-- Users can only access their own data
CREATE POLICY user_isolation ON users
  USING (auth.uid() = id);

CREATE POLICY generation_owner ON generations
  USING (user_id = auth.uid());
```

### 8. API Security

**Validation:**
- Input validation using Zod schemas
- Output sanitization
- File upload restrictions (max 20MB)
- MIME type validation

**Example:**
```typescript
const uploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 20971520, 'File too large')
    .refine(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type), 'Invalid file type')
})
```

### 9. Secrets Management

**Environment Variables:**
- Never commit `.env` files
- Use `.env.example` for templates
- All sensitive values in Vercel dashboard
- GitHub Actions use repository secrets

**Rotating Secrets:**
1. Update in Vercel dashboard
2. Create new secret version in Sentry/Stripe
3. Restart deployment
4. Verify in monitoring
5. Deactivate old secret

### 10. Logging & Monitoring

**What We Log:**
- Failed authentication attempts
- Rate limit violations
- Database errors
- Payment processing events
- File upload attempts

**What We DON'T Log:**
- Passwords or API keys
- Credit card information
- OAuth tokens
- Personal identification information (PII)

**Example Safe Log:**
```typescript
// Good
logger.info('User login successful', { userId: user.id, timestamp: new Date() })

// Bad
logger.info('User login', { user, password: user.password })
```

### 11. File Upload Security

**Validations:**
- File size limit: 20MB
- Allowed types: JPEG, PNG, WebP
- Dimension validation: max 4096x4096
- Virus scanning (recommended: ClamAV)
- Perceptual hashing for duplicate detection

**Storage:**
- Files stored in private S3 buckets
- Signed URLs for access (24-hour expiry)
- Automatic cleanup of unreferenced uploads
- Versioning enabled for recovery

### 12. Payment Security

**Stripe Integration:**
- PCI DSS compliance via Stripe
- No credit card data stored
- Webhook signature validation
- Idempotency keys for payments

**Implementation:**
```typescript
// Validate Stripe webhook signature
const signature = req.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
)
```

### 13. Dependency Management

**Security Updates:**
- Dependabot enabled for automated PRs
- Weekly security scans with Snyk
- npm audit before deployment
- OWASP Dependency Check in CI/CD

**Process:**
1. Dependabot opens PR for security update
2. CI/CD runs all checks
3. Code review and approval
4. Auto-merge for patch versions
5. Manual review for minor/major versions

### 14. Error Handling

**Public Errors:**
- Generic error messages to users
- No stack traces in production
- Detailed errors only in logs

**Example:**
```typescript
// Good: User-friendly error
res.status(500).json({ error: 'An error occurred. Please try again.' })

// Bad: Exposes implementation details
res.status(500).json({ error: error.stack })
```

### 15. Access Control

**Role-Based Access Control:**
```typescript
enum UserRole {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

// Middleware checks role
if (user.role === UserRole.FREE && user.credits < 10) {
  return res.status(403).json({ error: 'Insufficient credits' })
}
```

## Incident Response

### Reporting Security Issues

**DO NOT:**
- Open public GitHub issues
- Post on social media
- Email general support

**DO:**
- Email security@dream-pixel.app
- Include detailed reproduction steps
- Allow 48 hours for response
- Use PGP encryption if available

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Investigation**: 2-3 business days
- **Fix Development**: Depends on severity
- **Release**: As soon as possible
- **Disclosure**: 90 days from report

### Severity Levels

**Critical** (0 hours to fix):
- Authentication bypass
- Data breach in progress
- Active DDoS attack

**High** (24 hours):
- SQL injection vulnerability
- XSS vulnerability
- Privilege escalation

**Medium** (7 days):
- Information disclosure
- Account enumeration
- Rate limit bypass

**Low** (30 days):
- Minor information leak
- Non-critical configuration issue

## Compliance

### Standards

- **OWASP Top 10**: Implemented controls for all common vulnerabilities
- **NIST Cybersecurity Framework**: Risk management practices
- **GDPR**: User data protection policies
- **CCPA**: California privacy rights

### Data Retention

- User data: Deleted upon account deletion
- Logs: Retained for 30 days
- Backups: Retained for 90 days
- Audit logs: Retained for 1 year

### Audit Trail

All sensitive operations are logged:
- User authentication
- Payment transactions
- API key creation/rotation
- Database migrations
- Access to sensitive endpoints

## Security Checklist

### Before Production Deployment

- [ ] All environment variables configured in Vercel
- [ ] HTTPS enabled with valid certificate
- [ ] Security headers verified
- [ ] Database backups tested
- [ ] Rate limiting verified
- [ ] Sentry error tracking confirmed
- [ ] Stripe webhook signature validated
- [ ] CDN caching headers correct
- [ ] Image processing sandbox verified
- [ ] API rate limits tested

### Monthly Maintenance

- [ ] Review Sentry error reports for security issues
- [ ] Check Dependabot for security updates
- [ ] Verify database backups are working
- [ ] Test disaster recovery procedures
- [ ] Review access logs for anomalies
- [ ] Audit user accounts and permissions

### Quarterly Review

- [ ] Security audit of codebase
- [ ] Penetration testing (recommended)
- [ ] Update security policies
- [ ] Review compliance requirements
- [ ] Test incident response procedures

## Third-Party Dependencies

### Trusted Providers

- **Vercel**: Deployment and Edge Functions
- **Supabase**: PostgreSQL and authentication
- **Stripe**: Payment processing
- **Sentry**: Error tracking and monitoring
- **AWS S3/Cloudflare R2**: Image storage
- **Upstash Redis**: Caching and rate limiting

### Regular Audits

Dependencies are audited:
- Daily: npm audit
- Weekly: Dependabot
- Monthly: Manual review
- Quarterly: Full security assessment

## Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Next.js Security Best Practices](https://nextjs.org/docs)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Stripe Security](https://stripe.com/docs/security)
- [Sentry Best Practices](https://docs.sentry.io/)

## Questions?

For security questions, contact: security@dream-pixel.app

---

**Last Updated**: 2024
**Maintained By**: Security Team
**Review Schedule**: Quarterly
