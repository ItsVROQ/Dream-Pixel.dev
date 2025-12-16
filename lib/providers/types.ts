export interface GenerationSettings {
  width?: number
  height?: number
  guidance_scale?: number
  steps?: number
  num_variations?: number
  format?: string
  [key: string]: any
}

export interface GenerationRequest {
  prompt: string
  negativePrompt?: string
  seed?: number
  referenceImageUrl?: string
  settings: GenerationSettings
}

export interface GenerationResult {
  imageUrls: string[]
  metadata?: Record<string, any>
}

export interface AIProvider {
  name: string
  isHealthy(): Promise<boolean>
  generate(request: GenerationRequest): Promise<GenerationResult>
}
