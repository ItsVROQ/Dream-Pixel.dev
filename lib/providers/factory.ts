import { AIProvider } from './types'
import { geminiProvider } from './gemini'
import { stabilityProvider } from './stability'
import { replicateProvider } from './replicate'

const providers: Record<string, AIProvider> = {
  gemini: geminiProvider,
  stability: stabilityProvider,
  replicate: replicateProvider,
}

export function getProvider(providerName?: string): AIProvider {
  const name = providerName || process.env.AI_PROVIDER || 'gemini'
  const provider = providers[name]

  if (!provider) {
    throw new Error(`Unknown provider: ${name}`)
  }

  return provider
}

export function getAllProviders(): AIProvider[] {
  return Object.values(providers)
}

export function getProviderNames(): string[] {
  return Object.keys(providers)
}
