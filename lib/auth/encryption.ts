import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'fallback-encryption-key'
const ALGORITHM = 'aes-256-gcm'

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  cipher.setAAD(Buffer.from('api-key', 'utf8'))
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAAD(Buffer.from('api-key', 'utf8'))
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

export function generateApiKey(type: 'live' | 'test' = 'live'): string {
  const prefix = type === 'live' ? 'sk_live_' : 'sk_test_'
  const randomBytes = crypto.randomBytes(24).toString('hex') // 48 chars
  return `${prefix}${randomBytes}`
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

// Keep existing functions for backward compatibility or other uses
export function encryptApiKey(apiKey: string): EncryptedData {
  return encrypt(apiKey)
}

export function decryptApiKey(encryptedData: EncryptedData): string {
  return decrypt(encryptedData)
}

// For storing in database as JSON string
export function encryptApiKeyForStorage(apiKey: string): string {
  const encrypted = encryptApiKey(apiKey)
  return JSON.stringify(encrypted)
}

export function decryptApiKeyFromStorage(encryptedString: string): string {
  const encryptedData = JSON.parse(encryptedString) as EncryptedData
  return decryptApiKey(encryptedData)
}