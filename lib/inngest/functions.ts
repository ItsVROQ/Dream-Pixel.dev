import { inngest } from './client'
import { prisma } from '@/lib/prisma'
import { getProvider } from '@/lib/providers/factory'
import axios from 'axios'
import { redis } from '@/lib/redis'
import { sendEmail } from '@/lib/auth/email'
import { createLogger } from '@/lib/logger'

const MAX_RETRIES = parseInt(process.env.GENERATION_MAX_RETRIES || '3')
const TIMEOUT_MS = parseInt(process.env.GENERATION_TIMEOUT_SECONDS || '300') * 1000

interface GenerationPayload {
  generationId: string
  userId: string
  prompt: string
  negativePrompt?: string
  seed?: number
  referenceImageUrl?: string
  settings: Record<string, any>
  providerName?: string
}

export const generateImage = inngest.createFunction(
  { id: 'generate-image', timeout: `${Math.floor(TIMEOUT_MS / 1000)}s` },
  { event: 'generation/image.create' },
  async ({ event, step }) => {
    const payload = event.data as GenerationPayload
    const { generationId, userId, prompt, negativePrompt, seed, referenceImageUrl, settings, providerName } = payload
    
    const logger = createLogger({ generationId, userId, provider: providerName })

    try {
      // Get generation record
      const generation = await step.run('fetch-generation', async () => {
        return await prisma.generation.findUniqueOrThrow({
          where: { id: generationId },
          include: { user: true }
        })
      })

      // Fetch reference image if provided
      let referenceImageData: Buffer | undefined
      if (referenceImageUrl) {
        referenceImageData = await step.run('fetch-reference-image', async () => {
          try {
            const response = await axios.get(referenceImageUrl, {
              responseType: 'arraybuffer',
              timeout: 10000
            })
            logger.info('Reference image fetched successfully')
            return Buffer.from(response.data, 'binary')
          } catch (error) {
            logger.error('Failed to fetch reference image', error)
            return undefined
          }
        })
      }

      // Update status to PROCESSING
      await step.run('update-processing-status', async () => {
        await prisma.generation.update({
          where: { id: generationId },
          data: { status: 'PROCESSING' }
        })
        logger.info('Status updated to PROCESSING')
      })

      // Generate image with retry logic
      let imageUrls: string[] = []
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          imageUrls = await step.run(`generate-attempt-${attempt + 1}`, async () => {
            const provider = getProvider(providerName)
            const result = await provider.generate({
              prompt,
              negativePrompt,
              seed,
              referenceImageUrl,
              settings
            })
            return result.imageUrls
          })

          logger.info(`Successfully generated ${imageUrls.length} image(s)`)
          lastError = null
          break
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          logger.warn(`Generation attempt ${attempt + 1} failed: ${lastError.message}`)

          if (attempt < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s
            const delayMs = Math.pow(2, attempt) * 1000
            await step.sleep(`backoff-${attempt + 1}`, delayMs)

            // Update retry tracking
            await step.run(`update-retry-${attempt + 1}`, async () => {
              await prisma.generation.update({
                where: { id: generationId },
                data: {
                  retryCount: attempt + 1,
                  lastRetryAt: new Date()
                }
              })
            })
          }
        }
      }

      // Handle generation failure
      if (lastError || imageUrls.length === 0) {
        await step.run('handle-failure', async () => {
          const errorMessage = lastError?.message || 'No images generated'

          await prisma.generation.update({
            where: { id: generationId },
            data: {
              status: 'FAILED',
              errorMessage,
              retryCount: MAX_RETRIES
            }
          })

          // Send failure email
          try {
            await sendEmail({
              to: generation.user.email,
              subject: 'Image Generation Failed',
              htmlContent: `
                <p>Unfortunately, your image generation request has failed after ${MAX_RETRIES + 1} attempts.</p>
                <p><strong>Prompt:</strong> ${prompt}</p>
                <p><strong>Error:</strong> ${errorMessage}</p>
                <p>Please try again or contact support if the issue persists.</p>
              `
            })
          } catch (emailError) {
            logger.error('Failed to send error email', emailError)
          }

          logger.info(`Generation failed: ${errorMessage}`)
        })

        return { success: false, error: lastError?.message }
      }

      // Upload images and update generation record
      await step.run('upload-and-complete', async () => {
        const startTime = generation.createdAt.getTime()
        const processingTimeMs = Date.now() - startTime

        // Store first image URL (in production, you'd upload to storage service)
        const resultImageUrl = imageUrls[0]

        await prisma.generation.update({
          where: { id: generationId },
          data: {
            status: 'SUCCEEDED',
            resultImageUrl,
            processingTimeMs,
            completedAt: new Date()
          }
        })

        logger.info(`Completed in ${processingTimeMs}ms`)
      })

      // Decrement user credits after successful generation
      await step.run('decrement-credits', async () => {
        const creditsUsed = 1

        await prisma.user.update({
          where: { id: userId },
          data: {
            creditsRemaining: {
              decrement: creditsUsed
            }
          }
        })

        logger.info(`Decremented user credits by ${creditsUsed}`)
      })

      return { success: true, generationId, imageCount: imageUrls.length }
    } catch (error) {
      logger.error('Unexpected error', error)

      // Mark as failed
      try {
        await prisma.generation.update({
          where: { id: generationId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unexpected error'
          }
        })
      } catch (updateError) {
        logger.error('Failed to update generation status', updateError)
      }

      throw error
    }
  }
)

// Cleanup old pending generations
export const cleanupPendingGenerations = inngest.createFunction(
  { id: 'cleanup-pending-generations' },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const logger = createLogger({ generationId: 'cleanup' })
    logger.info('Starting cleanup of old pending generations')

    await step.run('cleanup-generations', async () => {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

      const result = await prisma.generation.updateMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoffTime }
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Generation timeout: exceeded 24 hour limit'
        }
      })

      logger.info(`Cleaned up ${result.count} old pending generations`)
    })

    return { cleaned: true }
  }
)
