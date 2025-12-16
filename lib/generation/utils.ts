import { z } from 'zod'

export const generateImageRequestSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(1000, 'Prompt must be less than 1000 characters'),
  negativePrompt: z.string()
    .max(1000, 'Negative prompt must be less than 1000 characters')
    .optional(),
  seed: z.number()
    .int()
    .min(0)
    .optional(),
  referenceImageUrl: z.string()
    .url('Invalid image URL')
    .optional(),
  settings: z.object({
    width: z.number()
      .int()
      .min(256, 'Width must be at least 256')
      .max(2048, 'Width must be at most 2048')
      .optional()
      .default(512),
    height: z.number()
      .int()
      .min(256, 'Height must be at least 256')
      .max(2048, 'Height must be at most 2048')
      .optional()
      .default(512),
    guidanceScale: z.number()
      .min(1, 'Guidance scale must be at least 1')
      .max(20, 'Guidance scale must be at most 20')
      .optional()
      .default(7.5),
    steps: z.number()
      .int()
      .min(10, 'Steps must be at least 10')
      .max(150, 'Steps must be at most 150')
      .optional()
      .default(50),
    numVariations: z.number()
      .int()
      .min(1, 'Number of variations must be at least 1')
      .max(4, 'Number of variations must be at most 4')
      .optional()
      .default(1),
    format: z.enum(['png', 'jpeg', 'webp'])
      .optional()
      .default('png'),
  }).default({}),
  provider: z.enum(['gemini', 'stability', 'replicate'])
    .optional(),
})

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>

export function validateGenerationRequest(data: unknown): GenerateImageRequest {
  return generateImageRequestSchema.parse(data)
}

export function calculateRequiredCredits(tier: string, settings: any): number {
  let credits = 1

  // High resolution uses more credits
  if ((settings.width || 512) > 1024 || (settings.height || 512) > 1024) {
    credits += 1
  }

  // Multiple variations use more credits
  const numVariations = settings.numVariations || 1
  if (numVariations > 1) {
    credits += numVariations - 1
  }

  // Reference image processing costs credits
  if (settings.referenceImageUrl) {
    credits += 1
  }

  return credits
}

export function getEstimatedProcessingTime(settings: any): string {
  const steps = settings.steps || 50
  
  if (steps <= 20) {
    return '10-15 seconds'
  } else if (steps <= 50) {
    return '20-40 seconds'
  } else {
    return '40-90 seconds'
  }
}
