# Dream Pixel Generation API - Phase 4

## Overview

The Dream Pixel Generation API provides an AI image generation service with a background job queue, provider abstraction, and comprehensive error handling.

## Features

### 1. Generation Endpoint

**POST /api/generate**

Create a new image generation request. Returns immediately with a job ID (HTTP 202).

```json
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

**Response:**
```json
{
  "jobId": "cuid_string",
  "status": "PENDING",
  "estimatedProcessingTime": "20-40 seconds",
  "creditsUsed": 1,
  "creditsRemaining": 99,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

### 2. Generation Status Endpoint

**GET /api/generate/:jobId**

Get the status of a generation job.

**Response:**
```json
{
  "generation": {
    "id": "cuid_string",
    "prompt": "A beautiful sunset over the ocean",
    "status": "PROCESSING",
    "progress": 50,
    "resultImageUrl": null,
    "errorMessage": null,
    "processingTimeMs": 5000,
    "provider": "gemini",
    "retryCount": 0
  }
}
```

### 3. List Generations

**GET /api/generate**

Get all generations for the current user.

### 4. Provider Health Check

**GET /api/health/providers**

Check the status of all configured AI providers.

**Response:**
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

## Rate Limiting

Rate limits are enforced per user tier:

- **FREE**: 1 generation per day
- **PRO**: 100 generations per day
- **ENTERPRISE**: 1000 generations per day

When rate limit is exceeded, the API returns HTTP 429 with:
```json
{
  "error": "Rate limit exceeded for your tier",
  "remaining": 0,
  "resetTime": "2024-01-02T00:00:00Z"
}
```

## Credit System

Credit deduction happens immediately upon request, regardless of generation success. Different settings consume different amounts of credits:

- Base generation: 1 credit
- High resolution (>1024px): +1 credit
- Multiple variations: +1 credit per extra variation
- Reference image: +1 credit

## Provider Abstraction

The API supports multiple AI providers with automatic failover:

- **Gemini**: Default provider, uses Google's Generative AI
- **Stability**: Stable Diffusion 3 via Stability AI
- **Replicate**: Community models via Replicate API

Providers are swapped via the `provider` parameter in the request or `AI_PROVIDER` environment variable.

## Error Handling

Failed generations automatically retry up to 3 times with exponential backoff:
- Attempt 1: 1 second delay
- Attempt 2: 2 second delay
- Attempt 3: 4 second delay

After all retries are exhausted, the generation is marked as FAILED and an email is sent to the user.

## Background Processing

Image generation happens asynchronously via Inngest. The typical flow is:

1. Request received → Generate record created → Job queued → Return job ID (HTTP 202)
2. Background job fetches reference image (if provided)
3. Background job calls AI provider
4. On failure, retry with exponential backoff
5. On success, update record, decrement credits, notify user
6. On final failure, notify user via email

## Logging

All operations are logged with context information (userId, generationId, provider). Enable debug logging with:

```bash
DEBUG=1 npm run dev
```

## Configuration

Required environment variables:

```env
# AI Provider API Keys
GEMINI_API_KEY=your_key
STABILITY_API_KEY=your_key
REPLICATE_API_KEY=your_key

# Default provider
AI_PROVIDER=gemini

# Inngest configuration
INNGEST_EVENT_KEY=your_key
INNGEST_SIGNING_KEY=your_key

# Generation settings
GENERATION_MAX_RETRIES=3
GENERATION_TIMEOUT_SECONDS=300
GENERATION_PROVIDER_TIMEOUT_SECONDS=60

# Rate limiting
GENERATION_FREE_TIER_LIMIT=1
GENERATION_FREE_TIER_WINDOW=86400
GENERATION_PRO_TIER_LIMIT=100
GENERATION_PRO_TIER_WINDOW=86400
GENERATION_ENTERPRISE_TIER_LIMIT=1000
GENERATION_ENTERPRISE_TIER_WINDOW=86400
```

## Database Migrations

After updating the schema, run:

```bash
npm run prisma:migrate
```

This adds the following fields to the generations table:
- `provider`: AI provider used
- `jobId`: Inngest job ID
- `retryCount`: Number of retry attempts
- `lastRetryAt`: Timestamp of last retry
- `completedAt`: Timestamp of completion
- `updatedAt`: Last update timestamp

## Status Values

- `PENDING`: Waiting to be processed
- `PROCESSING`: Currently being processed
- `SUCCEEDED`: Successfully completed
- `FAILED`: Failed after all retries

## Testing

You can test the API using:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=your_token" \
  -d '{
    "prompt": "A test image",
    "settings": {
      "width": 512,
      "height": 512
    }
  }'
```

## Future Enhancements

- WebSocket support for real-time status updates
- Image caching and deduplication
- Advanced provider selection based on load
- User-defined preferred providers
- Generation history and analytics
- Batch generation requests
