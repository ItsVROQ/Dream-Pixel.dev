import { AIProvider, GenerationRequest, GenerationResult } from './types'
import axios from 'axios'

const REPLICATE_API_URL = 'https://api.replicate.com/v1'
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

export class ReplicateProvider implements AIProvider {
  name = 'replicate'

  async isHealthy(): Promise<boolean> {
    try {
      if (!REPLICATE_API_KEY) {
        console.warn('Replicate API key not configured')
        return false
      }

      const response = await axios.get(
        `${REPLICATE_API_URL}/account`,
        {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_KEY}`,
            'Accept': 'application/json',
          },
          validateStatus: () => true,
        }
      )

      return response.status < 500
    } catch (error) {
      console.error('Replicate health check failed:', error)
      return false
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!REPLICATE_API_KEY) {
      throw new Error('Replicate API key not configured')
    }

    try {
      const width = request.settings.width || 512
      const height = request.settings.height || 512
      const steps = request.settings.steps || 50
      const guidanceScale = request.settings.guidance_scale || 7.5

      // Create prediction
      const predictionResponse = await axios.post(
        `${REPLICATE_API_URL}/predictions`,
        {
          version: 'db21e45d3f7023abc2a46ee38a6f7fdce7b08d3a54e41e541e9521c06d26f513', // Stable Diffusion 3
          input: {
            prompt: request.prompt,
            negative_prompt: request.negativePrompt || '',
            width: width,
            height: height,
            num_inference_steps: steps,
            guidance_scale: guidanceScale,
            num_outputs: request.settings.num_variations || 1,
            seed: request.settings.seed,
          }
        },
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      )

      if (predictionResponse.status !== 201) {
        throw new Error(`Replicate API error: ${predictionResponse.status}`)
      }

      const predictionId = predictionResponse.data.id

      // Poll for completion
      const imageUrls = await this.pollForCompletion(predictionId)

      return {
        imageUrls,
        metadata: {
          model: 'stable-diffusion-3',
          provider: this.name,
          predictionId: predictionId,
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Replicate generation failed: ${error.message}`)
      }
      throw error
    }
  }

  private async pollForCompletion(predictionId: string): Promise<string[]> {
    const maxRetries = 60 // Poll for up to 5 minutes (60 * 5 seconds)
    const pollInterval = 5000 // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
      const response = await axios.get(
        `${REPLICATE_API_URL}/predictions/${predictionId}`,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_KEY}`,
            'Accept': 'application/json',
          }
        }
      )

      const prediction = response.data

      if (prediction.status === 'succeeded') {
        return prediction.output || []
      }

      if (prediction.status === 'failed') {
        throw new Error(`Prediction failed: ${prediction.error}`)
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error('Prediction timeout: took too long to complete')
  }
}

export const replicateProvider = new ReplicateProvider()
