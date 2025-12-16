# Admin Panel & Analytics

## Overview

Comprehensive admin dashboard and analytics system with real-time monitoring for the Dream Pixel application.

## Features

### 1. Dashboard (`/admin`)
- **KPI Cards**: 
  - Total users
  - Active subscriptions
  - Total generations (24h/7d/30d)
  - Monthly Recurring Revenue (MRR)
- **Charts**:
  - User signups over time (last 30 days)
  - Generations over time (last 30 days)
- **Real-time Activity Feed**:
  - Recent generations
  - Recent signups
  - Recent subscriptions

### 2. User Management (`/admin/users`)
- Searchable table of all users
- **Filters**:
  - By tier (FREE/PRO/ENTERPRISE)
  - By status (ACTIVE/SUSPENDED)
  - By date range
  - Search by email or name
- **Actions**:
  - View detailed user profile
  - Upgrade/downgrade tier
  - Suspend/activate account
  - Reset password
  - Delete user
- **User Detail Modal**:
  - Full profile information
  - Generation history
  - Subscription details
  - Activity log

### 3. Generations Management (`/admin/generations`)
- Table of all generations with pagination
- **Filters**:
  - By user
  - By status (PENDING/PROCESSING/SUCCEEDED/FAILED)
  - By seed number
  - By date range
- **Actions**:
  - View generated image in modal
  - Delete specific generations
  - Bulk delete failed generations

### 4. Seeds Marketplace Management (`/admin/seeds`)
- **All Seeds Tab**:
  - Manage all seeds
  - Approve/reject submissions
  - Feature/unfeature seeds
  - Ban inappropriate seeds
  - Delete seeds
- **Analytics Tab**:
  - Most used seeds (all time)
  - Trending seeds (last 7 days)
  - Pending approval count
  - Banned seeds count

### 5. Analytics (`/admin/analytics`)
- **KPIs**:
  - Active subscriptions
  - Canceled subscriptions
  - Churn rate
  - Average processing time
- **Conversion Funnel**:
  - Signups → Verified → Generated → Subscribed
  - Visual conversion rate display
- **User Cohort Analysis**:
  - Retention by signup month
  - Month 1, 2, 3 retention rates
- **Popular Keywords**:
  - Word cloud of most used prompt keywords
  - Word frequency analysis

### 6. System Health (`/admin/system-health`)
- **Service Status**:
  - Database connection status and latency
  - Redis cache status and latency
  - API uptime percentage
  - Error rate (last 24h)
- **Storage Metrics**:
  - Total images stored
  - Estimated storage size
- **Error Logs**:
  - Last 100 errors (configurable)
  - Filter by level (ERROR/WARN/INFO)
  - View stack traces and metadata
  - Auto-refresh every 10 seconds (toggleable)

## API Endpoints

### Dashboard Stats
```
GET /api/admin/stats
```
Returns KPIs, charts data, and recent activity.

### User Management
```
GET /api/admin/users?page=1&limit=20&search=&tier=&status=&startDate=&endDate=
GET /api/admin/users/:id
PATCH /api/admin/users/:id
DELETE /api/admin/users/:id
```

### Generation Management
```
GET /api/admin/generations?page=1&limit=20&userId=&status=&seed=&startDate=&endDate=
DELETE /api/admin/generations (with body: { ids: [], status: '' })
```

### Seed Management
```
GET /api/admin/seeds?page=1&limit=20&category=&featured=&approved=&banned=
GET /api/admin/seeds/analytics
PATCH /api/admin/seeds/:id
DELETE /api/admin/seeds/:id
```

### Analytics
```
GET /api/admin/analytics/cohorts
GET /api/admin/analytics/funnel
GET /api/admin/analytics/churn
```

### System Health
```
GET /api/admin/system-health?logLevel=&logLimit=100
```

## Database Schema Changes

### User Model
- Added `role` field (USER/ADMIN)
- Added `status` field (ACTIVE/SUSPENDED)
- Added `lastActiveAt` field for tracking user activity

### Seed Model
- Added `isApproved` field for seed approval workflow
- Added `isBanned` field for content moderation

### ErrorLog Model (New)
- Tracks system errors, warnings, and info logs
- Includes stack traces, metadata, user context
- Indexed for fast querying

## Security

### Role-Based Access Control
- All admin routes (`/admin` and `/api/admin`) are protected
- Requires authenticated user with `ADMIN` role
- Middleware enforces admin access at route level

### Admin Middleware
Located at `/lib/auth/adminMiddleware.ts`:
- Verifies JWT token
- Checks user role is ADMIN
- Validates account is not suspended
- Returns 403 Forbidden for non-admin users

### Rate Limiting
- All admin API endpoints inherit from existing rate limiting
- Additional protection against brute force attacks

## Usage

### Creating an Admin User

To create an admin user, you need to update a user's role in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Or using Prisma:

```typescript
await prisma.user.update({
  where: { email: 'admin@example.com' },
  data: { role: 'ADMIN' }
})
```

### Accessing the Admin Panel

1. Login as a user with ADMIN role
2. Navigate to `/admin`
3. The dashboard will load with real-time stats

### Activity Tracking

- User's `lastActiveAt` is automatically updated on each authenticated request
- Visible in user management table
- Used for activity analytics

## Real-Time Features

### Auto-Refresh
- Dashboard stats refresh every 30 seconds
- System health auto-refresh every 10 seconds (toggleable)
- Manual refresh buttons available on all pages

### Live Activity Feed
- Shows most recent 10 generations/signups/subscriptions
- Updates with dashboard refresh
- Tabbed interface for easy navigation

## Performance Considerations

### Pagination
- All data tables use pagination (default 20 items per page)
- Reduces initial load time
- Improves UI responsiveness

### Query Optimization
- Indexes on commonly queried fields
- Aggregation queries use database-level operations
- Caching with Redis for frequently accessed data

### Error Logging
- Limited to last 100 errors by default
- Filterable by level to reduce noise
- Archived old logs should be cleaned up periodically

## Monitoring & Alerts

### System Health Checks
- Database connectivity
- Redis cache availability
- API error rate tracking
- Processing time monitoring

### Metrics Tracked
- User growth
- Subscription churn
- Generation success/failure rates
- Average processing time
- Popular prompts and keywords

## Future Enhancements

- Email alerts for critical system issues
- Custom date range selection for analytics
- Export data to CSV functionality
- Advanced filtering and sorting options
- Role permissions (SUPER_ADMIN, MODERATOR, etc.)
- Audit log for admin actions
- Dashboard customization and widgets
