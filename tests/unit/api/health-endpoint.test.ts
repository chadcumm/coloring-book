import { describe, it, expect } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('should return 200 OK status code', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    const response = await GET()

    expect(response.status).toBe(200)
  })

  it('should return JSON response with status field', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe('ok')
  })

  it('should include timestamp in response', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.timestamp).toBeDefined()
    expect(typeof data.timestamp).toBe('string')
  })

  it('should return valid ISO 8601 timestamp', async () => {
    const response = await GET()
    const data = await response.json()

    const timestamp = new Date(data.timestamp)
    expect(timestamp instanceof Date).toBe(true)
    expect(isNaN(timestamp.getTime())).toBe(false)
  })

  it('should include service name in response', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.service).toBeDefined()
    expect(typeof data.service).toBe('string')
  })

  it('should have service name as coloring-book-api', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.service).toBe('coloring-book-api')
  })

  it('should return response with correct content-type', async () => {
    const response = await GET()

    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should always return status ok', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await GET()
      const data = await response.json()
      expect(data.status).toBe('ok')
    }
  })

  it('should return timestamp that is recent (within last minute)', async () => {
    const before = new Date()
    const response = await GET()
    const data = await response.json()
    const after = new Date()

    const responseTime = new Date(data.timestamp)
    expect(responseTime.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000) // 1 second tolerance
    expect(responseTime.getTime()).toBeLessThanOrEqual(after.getTime() + 1000) // 1 second tolerance
  })

  it('should not contain any error fields', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.error).toBeUndefined()
    expect(data.message).toBeUndefined()
  })

  it('should handle multiple consecutive requests', async () => {
    const responses = await Promise.all([GET(), GET(), GET()])

    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
  })

  it('should return consistent response structure', async () => {
    const response1 = await GET()
    const data1 = await response1.json()

    const response2 = await GET()
    const data2 = await response2.json()

    expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort())
  })

  it('should not have cache-control headers preventing reuse', async () => {
    const response = await GET()

    // Health check should be cacheable
    const cacheControl = response.headers.get('cache-control')
    // Cache control may or may not be set, but if it is, it shouldn't be no-store
    if (cacheControl) {
      expect(cacheControl).not.toContain('no-store')
    }
  })

  it('response should be parseable as valid JSON', async () => {
    const response = await GET()
    const text = await response.text()

    expect(() => JSON.parse(text)).not.toThrow()
  })

  it('should return response without excessive payload', async () => {
    const response = await GET()
    const text = await response.text()

    // Health check should be lightweight
    expect(text.length).toBeLessThan(500)
  })
})
