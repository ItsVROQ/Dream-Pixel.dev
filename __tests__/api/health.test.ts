import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

describe('/api/health', () => {
  it('should return a health check with status code 200', async () => {
    const response = await GET()
    expect(response.status).toBeLessThanOrEqual(503)

    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('uptime')
    expect(data).toHaveProperty('checks')
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('environment')
  })

  it('should have all required check fields', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.checks).toHaveProperty('database')
    expect(data.checks).toHaveProperty('redis')
    expect(data.checks).toHaveProperty('api')

    expect(data.checks.database).toHaveProperty('status')
    expect(data.checks.database).toHaveProperty('responseTime')
  })

  it('should have a valid status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status)
  })

  it('should have positive uptime', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.uptime).toBeGreaterThanOrEqual(0)
  })
})
