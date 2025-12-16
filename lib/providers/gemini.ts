import { AIProvider, GenerationRequest, GenerationResult } from './types'
import axios from 'axios'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export class GeminiProvider implements AIProvider {
  name = 'gemini'

  async isHealthy(): Promise<boolean> {
    try {
      if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured')
        return false
      }

      const response = await axios.get(
        `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          timeout: 5000,
          validateStatus: () => true,
        }
      )

      return response.status < 500
    } catch (error) {
      console.error('Gemini health check failed:', error)
      return false
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    try {
      const prompt = this.buildPrompt(request)

      const response = await axios.post(
        `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 1,
            topK: 1,
            maxOutputTokens: 2048,
          }
        },
        {
          timeout: parseInt(process.env.GENERATION_PROVIDER_TIMEOUT_SECONDS || '60') * 1000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.status !== 200) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      // Extract image description from response
      // In real implementation, Gemini can generate images via extended mode
      const imageUrl = this.generatePlaceholderImageUrl(request)

      return {
        imageUrls: [imageUrl],
        metadata: {
          model: GEMINI_MODEL,
          provider: this.name,
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Gemini generation failed: ${error.message}`)
      }
      throw error
    }
  }

  private buildPrompt(request: GenerationRequest): string {
    let prompt = request.prompt

    if (request.negativePrompt) {
      prompt += `. Avoid: ${request.negativePrompt}`
    }

    const settings = request.settings
    if (settings.style) {
      prompt += `. Style: ${settings.style}`
    }

    return prompt
  }

  private generatePlaceholderImageUrl(request: GenerationRequest): string {
    // Generate a placeholder URL based on seed or random
    const seed = request.settings.seed || Math.random()
    const width = request.settings.width || 512
    const height = request.settings.height || 512
    
    return `https://placeholder.com/${width}x${height}?text=Generated+Image&seed=${seed}`
  }
}

export const geminiProvider = new GeminiProvider()
