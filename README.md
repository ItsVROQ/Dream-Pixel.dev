# Dream Pixel 🎨✨

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748)](https://www.prisma.io/)

Dream Pixel is a cutting-edge AI-powered image generation platform that allows users to create stunning, unique images using state-of-the-art artificial intelligence. Transform your ideas into visual art with just a prompt.

## 🌟 Features

### Core Features
- **🤖 AI Image Generation**: Generate high-quality images using multiple AI providers (Gemini, Stability AI, Replicate)
- **🔐 Complete Authentication System**: Email/password authentication with email verification, OAuth (Google, GitHub), password reset, and account lockout protection
- **💳 Subscription & Payments**: Integrated Stripe payment system with multiple tiers (FREE, PRO, ENTERPRISE)
- **📊 Admin Dashboard**: Comprehensive admin panel with real-time analytics, user management, and system monitoring
- **🖼️ Image Processing Pipeline**: Advanced image upload, processing, optimization, and CDN delivery
- **🔑 API Access**: Full REST API with API key authentication for developers
- **⚡ Background Job Processing**: Asynchronous image generation with retry logic and failure notifications
- **🌱 Seeds Marketplace**: Community-curated seed library for consistent image generation
- **📈 Analytics & Monitoring**: Detailed usage analytics, error logging, and system health monitoring

### Image Generation Features
- Multiple AI provider support with automatic failover
- Reference image support for style transfer
- Customizable generation settings (dimensions, guidance scale, steps, variations)
- Seed-based reproducible generations
- Real-time status tracking with polling
- Credit-based usage system
- Rate limiting per subscription tier

### Authentication & Security
- Email verification required for account activation
- bcryptjs password hashing with 12 salt rounds
- JWT token management with 7-day expiry
- CSRF protection with timing-safe validation
- Rate limiting with Upstash Redis
- Account lockout after 5 failed login attempts (15 min)
- OAuth integration (Google, GitHub)
- API key encryption for secure storage

### Payment & Subscription
- Stripe integration with webhook support
- Multiple subscription tiers with different limits
- Automatic credit allocation based on tier
- Invoice generation and PDF storage
- Usage tracking and warnings
- Subscription lifecycle management
- Secure payment processing

### Admin Features
- Real-time dashboard with KPIs
- User management (view, edit, suspend, delete)
- Generation monitoring and management
- Seeds marketplace moderation
- Cohort analysis and conversion funnels
- System health monitoring
- Error log viewer with auto-refresh
- Role-based access control

## 🚀 Live Demo

> 🔗 **Demo URL**: [Coming Soon]

> 📸 **Screenshots**: [Coming Soon]

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.6
- **UI Library**: React 18
- **Styling**: CSS Modules / Tailwind CSS (optional)

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Authentication**: NextAuth.js 4.24
- **Validation**: Zod 3.23

### Database & Storage
- **Database**: PostgreSQL (Supabase/Neon recommended)
- **ORM**: Prisma 5.22
- **Image Storage**: AWS S3 / Cloudflare R2
- **CDN**: Cloudflare
- **Caching**: Upstash Redis

### AI & Processing
- **AI Providers**: 
  - Google Gemini
  - Stability AI (Stable Diffusion)
  - Replicate
- **Image Processing**: Sharp 0.34
- **Background Jobs**: Inngest 3.13

### Payments & Communication
- **Payment Processing**: Stripe 16.12
- **Email Service**: Resend 3.4

### DevOps & Monitoring
- **Deployment**: Vercel (recommended)
- **Error Tracking**: Built-in error logging
- **Analytics**: Custom analytics dashboard
- **Health Checks**: Provider health monitoring

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Redis instance (Upstash recommended)
- AWS S3 or Cloudflare R2 account
- AI provider API keys (at least one)
- Stripe account (for payments)
- Email service account (Resend recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dream-pixel.git
cd dream-pixel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration (see [Environment Variables](#-environment-variables) section below).

### 4. Set Up Database

Run Prisma migrations to set up the database schema:

```bash
npm run prisma:migrate
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 6. (Optional) Open Prisma Studio

To view and edit your database:

```bash
npm run prisma:studio
```

## 🔑 Environment Variables

### Required Variables

#### Database
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```
Get from: [Supabase](https://supabase.com/), [Neon](https://neon.tech/), or your PostgreSQL provider

#### NextAuth
```env
NEXTAUTH_URL="http://localhost:3000"  # Your app URL
NEXTAUTH_SECRET="your-random-secret-key"  # Generate with: openssl rand -base64 32
```

#### OAuth Providers (Optional)
```env
# Google OAuth - Get from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth - Get from: https://github.com/settings/developers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

#### Email Service
```env
# Resend - Get from: https://resend.com/
RESEND_API_KEY="re_xxxxxxxxxxxx"
```

#### JWT & Security
```env
JWT_SECRET="another-random-secret-key"  # Generate with: openssl rand -base64 32
```

#### Redis Cache
```env
# Upstash Redis - Get from: https://console.upstash.com/
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

#### Stripe Payments
```env
# Stripe - Get from: https://dashboard.stripe.com/
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxx"

# Create these price IDs in Stripe Dashboard
STRIPE_PRICE_PRO_MONTHLY="price_xxxxxxxxxxxx"
STRIPE_PRICE_PRO_YEARLY="price_xxxxxxxxxxxx"
```

#### Image Storage (AWS S3 / Cloudflare R2)
```env
# AWS Credentials
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"

# S3 Bucket Configuration
S3_BUCKET_NAME="dream-pixel-images"
AWS_S3_INVOICE_BUCKET="dream-pixel-invoices"

# For Cloudflare R2, add this endpoint
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"

# CDN URL (CloudFront or Cloudflare CDN)
CDN_BASE_URL="https://cdn.yourdomain.com"
```

#### Supabase (Optional - for additional storage)
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

#### AI Provider API Keys
At least one is required:

```env
# Google Gemini - Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY="your-gemini-api-key"

# Stability AI - Get from: https://platform.stability.ai/
STABILITY_API_KEY="your-stability-api-key"

# Replicate - Get from: https://replicate.com/account/api-tokens
REPLICATE_API_KEY="your-replicate-api-key"

# Default provider to use
AI_PROVIDER="gemini"  # Options: gemini, stability, replicate
```

#### Inngest (Background Jobs)
```env
# Inngest - Get from: https://www.inngest.com/
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

### Optional Configuration Variables

#### Generation Settings
```env
GENERATION_MAX_RETRIES=3
GENERATION_TIMEOUT_SECONDS=300
GENERATION_PROVIDER_TIMEOUT_SECONDS=60
```

#### Rate Limiting - Generations
```env
GENERATION_FREE_TIER_LIMIT=1
GENERATION_FREE_TIER_WINDOW=86400
GENERATION_PRO_TIER_LIMIT=100
GENERATION_PRO_TIER_WINDOW=86400
GENERATION_ENTERPRISE_TIER_LIMIT=1000
GENERATION_ENTERPRISE_TIER_WINDOW=86400
```

#### Rate Limiting - API Requests
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Image Processing
```env
MAX_IMAGE_SIZE=20971520  # 20MB in bytes
MAX_IMAGE_DIMENSION=4096
IMAGE_QUALITY=90
THUMBNAIL_QUALITY=80
CACHE_TTL_GENERATION=31536000  # 1 year in seconds
CACHE_TTL_REFERENCE=86400     # 1 day in seconds
PERCEPTUAL_HASH_SIZE=16
```

## 📁 Project Structure

```
dream-pixel/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── admin/                # Admin panel endpoints
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── generations/          # Image generation API
│   │   ├── health/               # Health check endpoints
│   │   ├── images/               # Image management API
│   │   ├── inngest/              # Background job webhook
│   │   ├── invoices/             # Invoice management
│   │   ├── jobs/                 # Job status endpoints
│   │   ├── profile/              # User profile API
│   │   ├── stripe/               # Stripe webhooks
│   │   ├── subscription/         # Subscription management
│   │   └── user/                 # User management API
│   ├── admin/                    # Admin dashboard pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ImageUpload.tsx           # Image upload component
│   └── index.ts                  # Component exports
├── lib/                          # Utility functions and libraries
│   ├── auth/                     # Authentication utilities
│   │   ├── csrf.ts               # CSRF protection
│   │   ├── email.ts              # Email service
│   │   ├── encryption.ts         # API key encryption
│   │   ├── jwt.ts                # JWT token handling
│   │   ├── password.ts           # Password hashing
│   │   └── rateLimit.ts          # Rate limiting
│   ├── generation/               # Generation utilities
│   │   ├── rateLimit.ts          # Generation rate limiting
│   │   └── utils.ts              # Generation helpers
│   ├── inngest/                  # Background job functions
│   │   ├── client.ts             # Inngest client
│   │   └── functions.ts          # Job handlers
│   ├── providers/                # AI provider abstractions
│   │   ├── factory.ts            # Provider factory
│   │   ├── gemini.ts             # Gemini provider
│   │   ├── replicate.ts          # Replicate provider
│   │   ├── stability.ts          # Stability AI provider
│   │   └── types.ts              # Provider interfaces
│   ├── auth.ts                   # NextAuth configuration
│   ├── cdn.ts                    # CDN utilities
│   ├── cleanup.ts                # Cleanup jobs
│   ├── creditManager.ts          # Credit management
│   ├── imageProcessor.ts         # Image processing
│   ├── imageValidation.ts        # Image validation
│   ├── logger.ts                 # Logging utilities
│   ├── prisma.ts                 # Prisma client
│   ├── redis.ts                  # Redis client
│   ├── s3.ts                     # S3 client
│   ├── storage.ts                # Storage utilities
│   ├── stripe.ts                 # Stripe client
│   └── supabase.ts               # Supabase client
├── prisma/                       # Database schema and migrations
│   └── schema.prisma             # Prisma schema
├── public/                       # Static assets
├── types/                        # TypeScript type definitions
├── .env.example                  # Example environment variables
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
├── middleware.ts                 # Next.js middleware
├── next.config.mjs               # Next.js configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── ADMIN_PANEL_README.md         # Admin panel documentation
├── GENERATION_API.md             # Generation API documentation
└── README.md                     # This file
```

## 🔌 API Documentation

### REST API

The Dream Pixel API provides programmatic access to image generation and account management.

#### Base URL
```
http://localhost:3000/api  # Development
https://yourdomain.com/api # Production
```

#### Authentication

**API Key Authentication** (Recommended for programmatic access):
```bash
curl -H "x-api-key: your-api-key" https://yourdomain.com/api/generations
```

**JWT Token Authentication** (For web app):
```bash
curl -H "Authorization: Bearer your-jwt-token" https://yourdomain.com/api/generations
```

#### Main Endpoints

##### Generate Image
```http
POST /api/generations
Content-Type: application/json

{
  "prompt": "A beautiful sunset over the ocean",
  "negativePrompt": "ugly, blurry",
  "seed": 12345,
  "referenceImageUrl": "https://example.com/image.jpg",
  "settings": {
    "width": 512,
    "height": 512,
    "guidance_scale": 7.5,
    "steps": 50,
    "num_variations": 1,
    "format": "png"
  },
  "provider": "gemini"
}
```

**Response (202 Accepted)**:
```json
{
  "jobId": "clx1234567890",
  "status": "PENDING",
  "estimatedProcessingTime": "20-40 seconds",
  "creditsUsed": 1,
  "creditsRemaining": 99,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

##### Check Generation Status
```http
GET /api/generations/:jobId
```

**Response**:
```json
{
  "generation": {
    "id": "clx1234567890",
    "prompt": "A beautiful sunset over the ocean",
    "status": "SUCCEEDED",
    "resultImageUrl": "https://cdn.yourdomain.com/images/result.png",
    "processingTimeMs": 25000,
    "provider": "gemini",
    "createdAt": "2024-01-01T12:00:00Z",
    "completedAt": "2024-01-01T12:00:25Z"
  }
}
```

##### List Generations
```http
GET /api/generations?page=1&limit=20
```

##### Provider Health Check
```http
GET /api/health/providers
```

**Response**:
```json
{
  "status": "healthy",
  "providers": {
    "gemini": {
      "name": "gemini",
      "healthy": true,
      "status": "operational",
      "lastCheck": "2024-01-01T12:00:00Z"
    }
  },
  "configured": {
    "gemini": true,
    "stability": false,
    "replicate": false
  }
}
```

### Developer Portal

For detailed API documentation, interactive testing, and code examples, visit:

🔗 **Developer Portal**: `/developers` (Coming Soon)

### Webhooks

Dream Pixel supports webhooks for real-time notifications:

- Generation completed
- Generation failed
- Credit balance low
- Subscription status changed

Configure webhooks in your account settings.

### Rate Limits

| Tier | Generations/Day | API Requests/15min |
|------|----------------|--------------------|
| FREE | 1 | 100 |
| PRO | 100 | 1000 |
| ENTERPRISE | 1000 | 10000 |

When rate limit is exceeded, API returns **429 Too Many Requests**.

For complete API documentation, see [GENERATION_API.md](./GENERATION_API.md).

## 🗄️ Database Schema

### Core Models

#### User
Stores user account information, authentication data, and tier information.
```prisma
model User {
  id                  String     @id @default(cuid())
  email               String     @unique
  name                String?
  passwordHash        String?
  tier                UserTier   @default(FREE)
  role                UserRole   @default(USER)
  status              UserStatus @default(ACTIVE)
  apiKey              String?    @unique
  creditsRemaining    Int        @default(0)
  emailVerified       DateTime?
  // ... relations and timestamps
}
```

**Tiers**: `FREE` | `PRO` | `ENTERPRISE`  
**Roles**: `USER` | `ADMIN`  
**Status**: `ACTIVE` | `SUSPENDED`

#### Generation
Tracks all image generation requests and their status.
```prisma
model Generation {
  id                String           @id @default(cuid())
  userId            String
  prompt            String
  negativePrompt    String?
  seed              Int?
  status            GenerationStatus @default(PENDING)
  provider          String?
  jobId             String?
  retryCount        Int              @default(0)
  resultImageId     String?
  // ... settings, timestamps, relations
}
```

**Status**: `PENDING` | `PROCESSING` | `SUCCEEDED` | `FAILED`

#### Image
Stores image metadata and URLs for all uploaded and generated images.
```prisma
model Image {
  id             String      @id @default(cuid())
  userId         String
  type           ImageType
  status         ImageStatus @default(UPLOADED)
  s3Key          String
  url            String
  thumbnailUrl   String?
  hash           String?     @unique
  // ... dimensions, metadata
}
```

**Types**: `REFERENCE` | `GENERATION` | `THUMBNAIL` | `MEDIUM` | `FULL`

#### Subscription
Manages user subscriptions and billing.
```prisma
model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  status               SubscriptionStatus @default(INACTIVE)
  currentPeriodEnd     DateTime?
  // ... billing details
}
```

**Status**: `INACTIVE` | `TRIALING` | `ACTIVE` | `PAST_DUE` | `CANCELED` | `UNPAID` | `INCOMPLETE`

#### Seed
Community-contributed seeds for reproducible generations.
```prisma
model Seed {
  id            String       @id @default(cuid())
  seedNumber    Int          @unique
  creatorId     String
  title         String
  category      SeedCategory
  useCount      Int          @default(0)
  isFeatured    Boolean      @default(false)
  isApproved    Boolean      @default(false)
  // ... description, images
}
```

**Categories**: `PORTRAIT` | `LANDSCAPE` | `ANIME` | `ABSTRACT` | `OTHER`

### Supporting Models
- **Invoice**: Stripe invoice records with PDF storage
- **StripeEvent**: Idempotent webhook event processing
- **Account**: OAuth account linking (NextAuth)
- **Session**: User session management (NextAuth)
- **VerificationToken**: Email verification tokens
- **ErrorLog**: System error and warning logs

For the complete schema, see [prisma/schema.prisma](./prisma/schema.prisma).

## 🎯 Getting Started Guide

### For End Users

#### 1. Sign Up
1. Visit the homepage
2. Click "Sign Up"
3. Enter your email and password, or use Google/GitHub OAuth
4. Check your email for verification link
5. Click the link to verify your account

#### 2. Generate Your First Image
1. Log in to your account
2. Navigate to the "Generate" page
3. Enter a descriptive prompt (e.g., "A serene mountain landscape at sunset")
4. (Optional) Adjust settings like dimensions, guidance scale, and steps
5. Click "Generate"
6. Wait for processing (typically 20-40 seconds)
7. View and download your generated image

#### 3. Browse Seeds Marketplace
1. Go to "Seeds" or "Marketplace"
2. Browse featured and community seeds
3. Click on a seed to view examples
4. Use the seed number in your next generation for similar style

#### 4. Upgrade to Pro
1. Navigate to "Subscription" or "Pricing"
2. Choose Pro Monthly or Pro Yearly
3. Enter payment details (powered by Stripe)
4. Enjoy 100 generations per day and additional features

#### 5. Manage API Keys
1. Go to your "Profile" or "Settings"
2. Navigate to "API Keys" section
3. Click "Generate New API Key"
4. Copy and securely store your API key
5. Use it to access the API programmatically

#### 6. Access Admin Dashboard (Admin Only)
1. Log in as a user with ADMIN role
2. Navigate to `/admin`
3. View real-time stats, manage users, moderate content
4. Monitor system health and view error logs

### For Developers

#### Quick Start with API

1. **Get your API key** from your account settings

2. **Make your first generation request**:
```bash
curl -X POST https://yourdomain.com/api/generations \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "prompt": "A futuristic city at night",
    "settings": {
      "width": 512,
      "height": 512
    }
  }'
```

3. **Poll for status**:
```bash
curl -H "x-api-key: your-api-key" \
  https://yourdomain.com/api/generations/job-id-here
```

4. **Download the result** from the `resultImageUrl` in the response

## 👨‍💻 Development Guide

### Running in Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Style and Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code (if using Prettier)
npm run format
```

### Database Migrations

#### Create a new migration
```bash
npm run prisma:migrate
```

#### Apply migrations
```bash
npx prisma migrate deploy
```

#### Reset database (development only)
```bash
npx prisma migrate reset
```

#### View database in Prisma Studio
```bash
npm run prisma:studio
```

### Adding New AI Providers

1. **Create provider implementation** in `lib/providers/`:
```typescript
// lib/providers/newprovider.ts
import { AIProvider, GenerationRequest, GenerationResult } from './types';

export class NewProviderAI implements AIProvider {
  name = 'newprovider';
  
  async generateImage(request: GenerationRequest): Promise<GenerationResult> {
    // Implementation
  }
  
  async healthCheck(): Promise<boolean> {
    // Implementation
  }
}
```

2. **Register in factory** (`lib/providers/factory.ts`):
```typescript
case 'newprovider':
  return new NewProviderAI();
```

3. **Add environment variable** to `.env.example`:
```env
NEWPROVIDER_API_KEY="your-api-key"
```

4. **Update documentation** in this README and GENERATION_API.md

### Common Development Tasks

#### Create an admin user
```typescript
// Run in Prisma Studio or via script
await prisma.user.update({
  where: { email: 'admin@example.com' },
  data: { role: 'ADMIN' }
})
```

#### Manually trigger a background job
```bash
curl -X POST http://localhost:3000/api/inngest \
  -H "Content-Type: application/json" \
  -d '{"name": "app/generation.process", "data": {...}}'
```

#### Clear Redis cache
```typescript
// In your code or via Redis CLI
import redis from '@/lib/redis';
await redis.flushall();
```

#### Generate Stripe webhook signing secret
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhooks
# Copy the webhook signing secret to .env.local
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

Dream Pixel is optimized for deployment on Vercel.

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Deploy
```bash
vercel
```

#### 3. Set Environment Variables
In your Vercel project settings, add all environment variables from `.env.example`.

#### 4. Set Up Database
Ensure your production database is accessible and run migrations:
```bash
npx prisma migrate deploy
```

#### 5. Configure Domains
Set up your custom domain in Vercel project settings and update `NEXTAUTH_URL`.

### Environment Setup for Production

1. **Use production database**: Update `DATABASE_URL` to production PostgreSQL
2. **Use production Redis**: Update Upstash Redis URLs
3. **Use production Stripe keys**: Switch from test keys to live keys
4. **Configure S3/R2**: Set up production bucket with proper CORS
5. **Set up CDN**: Configure CloudFront or Cloudflare CDN
6. **Enable production AI keys**: Use production API keys for Gemini, Stability, Replicate
7. **Set secure secrets**: Generate new random secrets for `NEXTAUTH_SECRET` and `JWT_SECRET`

### Database Migrations in Production

**Important**: Always run migrations carefully in production.

```bash
# Review migration before applying
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Monitoring and Alerting

#### Built-in Monitoring
- Access admin dashboard at `/admin/system-health`
- View error logs at `/admin/system-health` (Error Logs tab)
- Check provider health at `/api/health/providers`

#### External Monitoring (Recommended)
- **Sentry**: Add Sentry SDK for error tracking
- **PostHog**: Add PostHog for product analytics
- **Vercel Analytics**: Enable in Vercel dashboard
- **Uptime Monitoring**: Use UptimeRobot or similar

### Backup Strategy

1. **Database**: Configure automated daily backups (Supabase/Neon provide this)
2. **Images**: Enable S3 versioning and configure lifecycle policies
3. **Environment Variables**: Store securely in 1Password or similar
4. **Code**: Use Git tags for releases

For detailed deployment instructions, see the [Deployment Guide](./docs/DEPLOYMENT.md) (coming soon).

## 🤝 Contributing

We welcome contributions to Dream Pixel! Here's how you can help:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation
4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues
   - Wait for review

### Development Workflow

1. **Check existing issues** before starting work
2. **Discuss major changes** by opening an issue first
3. **Write clear commit messages** (use conventional commits)
4. **Keep PRs focused** - one feature/fix per PR
5. **Update tests and documentation** with your changes

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Follow the project's coding standards

### Pull Request Process

1. Ensure all tests pass
2. Update the README.md with any new environment variables or setup steps
3. Add a description of your changes to the PR
4. Request review from maintainers
5. Address feedback and iterate
6. Once approved, a maintainer will merge your PR

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage
- 🌐 Internationalization

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues

**Problem**: "Can't reach database server"

**Solutions**:
- Check `DATABASE_URL` is correctly formatted
- Ensure database is running and accessible
- Verify network connectivity
- Check firewall rules allow connection
- For Supabase, ensure connection pooling is enabled

```bash
# Test connection with Prisma
npx prisma db pull
```

#### Authentication Problems

**Problem**: "Session callback error" or "JWT error"

**Solutions**:
- Ensure `NEXTAUTH_SECRET` is set and consistent across deployments
- Verify `NEXTAUTH_URL` matches your actual URL
- Clear browser cookies and try again
- Check JWT_SECRET is set

**Problem**: "Email not verified"

**Solutions**:
- Check email service (Resend) is configured correctly
- Look for verification email in spam folder
- Manually verify user in database:
```sql
UPDATE users SET email_verified = NOW() WHERE email = 'user@example.com';
```

#### Image Processing Errors

**Problem**: "Failed to upload image" or "Image too large"

**Solutions**:
- Check image size is under 20MB (configurable)
- Ensure image dimensions are under 4096px (configurable)
- Verify S3/R2 credentials are correct
- Check S3 bucket CORS configuration
- Ensure Sharp library is properly installed

**Problem**: "CDN URL not working"

**Solutions**:
- Verify `CDN_BASE_URL` is correctly set
- Check CloudFront/Cloudflare distribution is active
- Ensure S3 bucket policy allows public read
- Verify cache invalidation if recently deployed

#### Payment Issues

**Problem**: "Stripe webhook failed"

**Solutions**:
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint is publicly accessible
- Review webhook logs in Stripe Dashboard
- Ensure endpoint returns 200 status
- Check StripeEvent model for duplicate processing

**Problem**: "Subscription not updating"

**Solutions**:
- Manually trigger webhook events in Stripe Dashboard
- Check subscription status in database
- Review error logs at `/admin/system-health`

#### Generation Failures

**Problem**: "Generation stuck in PENDING"

**Solutions**:
- Check Inngest dashboard for failed jobs
- Verify AI provider API keys are valid
- Check provider health: `/api/health/providers`
- Review error logs
- Manually retry generation:
```typescript
await prisma.generation.update({
  where: { id: 'generation-id' },
  data: { status: 'PENDING', retryCount: 0 }
})
```

**Problem**: "Provider API error"

**Solutions**:
- Verify API keys are correct and active
- Check provider status page
- Review rate limits on provider account
- Try switching to different provider
- Check provider timeout settings

#### Redis Connection Issues

**Problem**: "Failed to connect to Redis"

**Solutions**:
- Verify Upstash Redis URL and token
- Check Redis instance is active
- Test connection with Redis CLI
- Review rate limiting configuration

#### Performance Issues

**Problem**: "Slow page loads"

**Solutions**:
- Enable database connection pooling
- Check Redis cache is working
- Optimize large database queries
- Use CDN for static assets
- Enable Next.js image optimization
- Review Prisma query efficiency

### Getting Help

If you encounter issues not covered here:

1. **Search existing issues** on GitHub
2. **Check documentation** in `/docs` folder
3. **Review error logs** at `/admin/system-health`
4. **Enable debug logging** with `DEBUG=1`
5. **Open an issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Environment details
   - Error messages and logs
   - What you've tried

## ❓ FAQ

### General Questions

**Q: What's the free tier limit?**  
A: The FREE tier includes 1 generation per day. You can upgrade to PRO for 100 generations/day or ENTERPRISE for 1000 generations/day.

**Q: How do I upgrade to PRO?**  
A: Navigate to the "Subscription" or "Pricing" page in your account dashboard. Choose your plan (monthly or yearly) and complete payment via Stripe. Your upgrade is instant.

**Q: Can I downgrade my subscription?**  
A: Yes, you can downgrade or cancel at any time. Changes take effect at the end of your current billing period.

**Q: What happens to my credits when I upgrade?**  
A: Your credit balance carries over. When you upgrade, your daily generation limit increases immediately.

**Q: Do unused generations roll over?**  
A: No, generation limits are daily and reset at midnight UTC. Upgrade to a higher tier for more daily generations.

### Technical Questions

**Q: Can I use custom AI providers?**  
A: Currently, we support Gemini, Stability AI, and Replicate. You can extend the system by implementing the `AIProvider` interface in `lib/providers/` and registering it in the factory. See [Adding New AI Providers](#adding-new-ai-providers).

**Q: How do I get API access?**  
A: API access is available to all users. Generate an API key in your account settings under "API Keys". Include it in requests using the `x-api-key` header.

**Q: Is there a rate limit for API requests?**  
A: Yes, API requests are rate-limited based on your tier:
- FREE: 100 requests per 15 minutes
- PRO: 1000 requests per 15 minutes
- ENTERPRISE: 10000 requests per 15 minutes

**Q: How long are generated images stored?**  
A: Generated images are stored permanently on S3/R2 and served via CDN. You can delete images at any time from your account.

**Q: Can I use generated images commercially?**  
A: Yes, you own the rights to images you generate. However, check the terms of service of the underlying AI provider (Gemini, Stability, etc.) for any restrictions.

**Q: What image formats are supported?**  
A: We support PNG, JPEG, and WebP for reference images. Generated images are provided in the format specified in your request (default: PNG).

### Self-Hosting Questions

**Q: Is there a self-hosted version?**  
A: Yes! Dream Pixel is open source and can be self-hosted. Follow the [Installation & Setup](#-installation--setup) guide to deploy on your own infrastructure.

**Q: What are the minimum server requirements?**  
A: Recommended minimums:
- 2 CPU cores
- 4GB RAM
- 20GB storage (more for image storage)
- PostgreSQL database
- Redis instance
- Node.js 18+

**Q: Can I use a different database?**  
A: The codebase uses Prisma ORM, which supports PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, and CockroachDB. You'll need to update the Prisma schema and test thoroughly.

**Q: Do I need all three AI providers?**  
A: No, you only need API keys for at least one provider. Set `AI_PROVIDER` to your preferred provider.

### Support Questions

**Q: How do I report a bug?**  
A: Open an issue on GitHub with a clear description, steps to reproduce, and relevant error messages.

**Q: How do I request a feature?**  
A: Open a feature request issue on GitHub. Describe the feature, use case, and why it would be valuable.

**Q: Is there a Discord or community forum?**  
A: [Coming Soon] - We're setting up a community Discord server for users and developers.

**Q: How do I get enterprise support?**  
A: Contact us at enterprise@dreampixel.ai for dedicated support, SLAs, and custom deployment options.

## 📄 License

Dream Pixel is open source software licensed under the [MIT License](https://opensource.org/licenses/MIT).

```
MIT License

Copyright (c) 2024 Dream Pixel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Credits & Acknowledgments

Dream Pixel is built with incredible open source technologies:

### Core Technologies
- [Next.js](https://nextjs.org/) - React framework by Vercel
- [React](https://react.dev/) - UI library by Meta
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication for Next.js

### AI & Processing
- [Google Gemini](https://ai.google.dev/) - Generative AI by Google
- [Stability AI](https://stability.ai/) - Stable Diffusion models
- [Replicate](https://replicate.com/) - ML model hosting
- [Sharp](https://sharp.pixelplumbing.com/) - High-performance image processing

### Infrastructure & Services
- [Vercel](https://vercel.com/) - Deployment and hosting
- [Upstash](https://upstash.com/) - Serverless Redis
- [Stripe](https://stripe.com/) - Payment processing
- [Resend](https://resend.com/) - Transactional email
- [Inngest](https://www.inngest.com/) - Background job processing

### Development Tools
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI

### Community
Special thanks to all contributors, early adopters, and the open source community for making Dream Pixel possible.

## 👥 Author & Maintainers

**Dream Pixel Team**

- 🌐 Website: [Coming Soon]
- 📧 Email: hello@dreampixel.ai
- 🐦 Twitter: [@dreampixelai](https://twitter.com/dreampixelai)
- 💬 Discord: [Coming Soon]

---

## 📚 Additional Documentation

- [Generation API Documentation](./GENERATION_API.md) - Detailed API reference
- [Admin Panel Guide](./ADMIN_PANEL_README.md) - Admin dashboard features
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment (coming soon)
- [Contributing Guide](./docs/CONTRIBUTING.md) - Contribution guidelines (coming soon)
- [Changelog](./CHANGELOG.md) - Version history (coming soon)

---

<div align="center">

**[⭐ Star us on GitHub](https://github.com/yourusername/dream-pixel)** | **[🐛 Report Bug](https://github.com/yourusername/dream-pixel/issues)** | **[💡 Request Feature](https://github.com/yourusername/dream-pixel/issues)**

Made with ❤️ by the Dream Pixel Team

</div>
