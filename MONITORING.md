# Monitoring & Observability Guide

## Overview

Dream Pixel uses a comprehensive monitoring stack to track application health, performance, and errors in production.

## Monitoring Stack

```
┌─────────────────────────────────────────────────┐
│           Application (Next.js)                 │
│   ├─ Error Tracking (Sentry)                    │
│   ├─ Performance Monitoring (Web Vitals)        │
│   ├─ API Metrics (Custom)                       │
│   └─ Structured Logging (JSON)                  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        │          │          │          │
   ┌────┴───┐  ┌──┴───┐  ┌──┴────┐  ┌─┴─────┐
   │ Sentry │  │ Logs │  │Metrics│  │Alerts │
   └────────┘  └──────┘  └───────┘  └───────┘
```

## 1. Error Tracking (Sentry)

### Setup

Sentry is configured in both client and server contexts:

**Client-side initialization** (`sentry.client.config.ts`):
```typescript
Sentry.init({
  dsn: NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.APP_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
})
```

**Server-side initialization** (`sentry.server.config.ts`):
```typescript
Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.APP_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
```

### Key Features

**Exception Tracking:**
- Automatically captures unhandled errors
- Groups related errors intelligently
- Tracks error frequency and trends

**Performance Monitoring:**
- API endpoint response times
- Database query performance
- Page load metrics

**Session Replay:**
- Records user sessions with poor experience
- Helps debug issues by replaying steps
- Enabled at 10% sample rate

**Release Tracking:**
- Links errors to specific releases
- Enables source map uploads
- Version information in error reports

### Viewing Errors in Sentry

1. **Dashboard**: https://sentry.io/organizations/your-org/
2. **Issues Tab**: See all reported errors
3. **Filters**:
   - Environment: production
   - Release: [version]
   - Error Type: [specific error]

### Common Error Types

**Authentication Errors:**
```
Error: Unauthorized
- Check JWT token expiration
- Verify NextAuth configuration
- Review session storage
```

**Database Errors:**
```
Error: Database connection failed
- Check connection string
- Verify Supabase status
- Review connection pool
```

**Image Processing Errors:**
```
Error: Image processing failed
- Check file size
- Verify image format
- Review Sharp configuration
```

## 2. Structured Logging

### Logger Interface

```typescript
import { logger } from '@/lib/logger'

// Log levels: error, warn, info, debug
logger.error('Error message', { context: 'data' })
logger.warn('Warning message', { context: 'data' })
logger.info('Info message', { context: 'data' })
logger.debug('Debug message', { context: 'data' })
```

### Log Format

All logs are in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "error",
  "message": "Failed to process image",
  "data": {
    "userId": "user-123",
    "imageId": "img-456",
    "fileSize": 5242880
  },
  "error": "Image dimensions exceed maximum"
}
```

### Log Levels

| Level | Purpose | Examples |
|-------|---------|----------|
| error | Critical failures | Database connection lost, authentication failed |
| warn | Potential issues | Slow query, rate limit near |
| info | Important events | User signup, payment processed |
| debug | Development info | Variable values, function calls |

### Environment Variables

Control logging with:

```bash
LOG_LEVEL=info          # Only log info and above
DEBUG_MODE=false        # Disable debug mode
```

## 3. Performance Monitoring

### Web Vitals

Core Web Vitals are tracked and reported to Sentry:

**Key Metrics:**

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID (First Input Delay) | ≤ 100ms | ≤ 300ms | > 300ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP (First Contentful Paint) | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB (Time to First Byte) | ≤ 600ms | ≤ 1.2s | > 1.2s |

**Tracking:**

Web Vitals are automatically tracked via Sentry:

```typescript
reportWebVitals(metric: WebVitals) => {
  // Sent to Sentry automatically
  // Alerts on poor metrics
}
```

### API Performance

**Metrics Tracked:**
- Response time per endpoint
- Error rate by endpoint
- Request count by endpoint

**Viewing Metrics:**

1. Sentry → Performance → Transactions
2. Filter by endpoint name
3. View response time distribution
4. Check error rate

**Threshold Alerts:**
- API latency > 2 seconds (p95)
- Error rate > 1%
- Database queries > 500ms

## 4. Database Monitoring

### Supabase Monitoring

**Access:** https://app.supabase.com → Monitoring

**Key Metrics:**
- Query execution time
- Number of queries
- Cache hit rate
- Connection pool usage

### Recommended Indexes

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

### Slow Query Log

Monitor slow queries:

```sql
-- Show slow queries
SELECT * FROM pg_stat_statements
WHERE query_time > 500  -- 500ms
ORDER BY query_time DESC;
```

## 5. Uptime Monitoring

### Health Check Endpoint

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-15T10:30:45Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "up|down", "responseTime": 10 },
    "redis": { "status": "up|down", "responseTime": 5 },
    "api": { "status": "up|down", "responseTime": 15 }
  },
  "version": "0.1.0",
  "environment": "production"
}
```

### Monitoring with Better Uptime

1. Create monitor at https://betteruptime.com
2. Endpoint: `https://yourdomain.com/api/health`
3. Check interval: 5 minutes
4. Timeout: 30 seconds
5. Alerts: SMS, email, Slack

## 6. Alert Configuration

### Sentry Alerts

Create alert rules in Sentry dashboard:

**Rule 1: High Error Rate**
```
Condition: Event count is 10 or more in 5 minutes
Action: Send to email
```

**Rule 2: New Issue**
```
Condition: A new issue is created
Filter: Environment = production
Action: Send to Slack
```

**Rule 3: Performance Regression**
```
Condition: Transaction duration > 2 seconds (p95)
Action: Send to email
```

### Email Alerts

Configure email notifications:
1. Sentry Settings → Notifications
2. Enable: Critical, Regression, Deploy
3. Set digest interval

### Slack Integration

**Setup:**
1. Sentry → Integrations → Slack
2. Authorize Slack workspace
3. Select channel for alerts

**Alert Template:**
```
🚨 Error in Production
App: Dream Pixel
Error: Database connection failed
Affected Users: 42
Last 24h Error Count: 128
```

### PagerDuty Integration (Enterprise)

1. Create PagerDuty service
2. Sentry → Integrations → PagerDuty
3. Link to service

## 7. Dashboarding

### Recommended Dashboards

**Operations Dashboard:**
- Deploy frequency
- Lead time for changes
- Time to restore service
- Change failure rate

**Performance Dashboard:**
- Web Vitals (LCP, FID, CLS)
- API response times
- Database query times
- Cache hit rates

**Error Dashboard:**
- Error rate by endpoint
- Error type distribution
- Affected users
- Error trends

### Tools

- **Sentry**: Built-in dashboard
- **Grafana**: Custom dashboards (optional)
- **Datadog**: Comprehensive observability (optional)
- **Google Sheets**: Simple metrics tracking

## 8. Incident Response

### When Alerts Fire

**Step 1: Assess (5 minutes)**
- Check Sentry dashboard
- View health check status
- Check database status
- Review recent deployments

**Step 2: Communicate (5 minutes)**
- Post in #incidents Slack channel
- Notify on-call engineer
- Update status page

**Step 3: Investigate (15 minutes)**
- Check logs for root cause
- Review recent changes
- Check third-party services
- Analyze metrics

**Step 4: Mitigate (varies)**
- Rollback if needed
- Disable feature
- Scale up resources
- Apply hotfix

**Step 5: Resolve**
- Verify fix
- Monitor metrics
- Update incident log
- Plan post-mortem

### Critical Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 1% | P1 - Page engineer |
| API latency (p95) | > 2s | P2 - Investigate |
| Database latency | > 500ms | P2 - Check query |
| Uptime | < 99.9% | P1 - Emergency |
| Failed payments | > 5% | P1 - Disable Stripe |

## 9. Performance Optimization

### Identifying Bottlenecks

**Slow API Endpoints:**
```
Sentry → Performance → Transactions
Sort by: Duration (highest first)
```

**Slow Queries:**
```sql
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Optimization Strategies

**Database:**
- Add indexes
- Optimize queries
- Enable caching
- Increase connection pool

**API:**
- Cache responses
- Reduce payload size
- Use streaming
- Batch requests

**Frontend:**
- Code splitting
- Lazy loading
- Image optimization
- Cache assets

## 10. Metrics Export

### Prometheus Integration (Optional)

Export metrics to Prometheus:

```typescript
// /api/metrics
export function GET() {
  const metrics = performanceMonitor.getMetrics()
  
  let prometheusMetrics = ''
  metrics.forEach(metric => {
    prometheusMetrics += `${metric.name}{unit="${metric.unit}"} ${metric.value}\n`
  })
  
  return new Response(prometheusMetrics, {
    headers: { 'Content-Type': 'text/plain' }
  })
}
```

Scrape configuration:

```yaml
scrape_configs:
  - job_name: 'dream-pixel'
    static_configs:
      - targets: ['https://yourdomain.com/api/metrics']
```

## Maintenance Schedule

### Daily
- [ ] Check Sentry dashboard for critical errors
- [ ] Verify uptime monitoring status
- [ ] Review error rate trends

### Weekly
- [ ] Analyze Web Vitals data
- [ ] Check database performance
- [ ] Review slow queries
- [ ] Optimize if needed

### Monthly
- [ ] Performance audit
- [ ] Dependency updates
- [ ] Query optimization
- [ ] Capacity planning

### Quarterly
- [ ] Full observability review
- [ ] Alert threshold tuning
- [ ] Monitoring tool evaluation
- [ ] Disaster recovery test

---

**Last Updated**: 2024
**Maintained By**: DevOps Team
