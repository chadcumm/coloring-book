import { test, expect } from '@playwright/test'

test.describe('API health check', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('ok')
  })
})

test.describe('API process endpoint', () => {
  test('GET /api/process returns health status', async ({ request }) => {
    const response = await request.get('/api/process')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('ok')
  })

  test('POST /api/process without body returns error', async ({ request }) => {
    const response = await request.post('/api/process')
    // Should return 400 for missing required fields
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('POST /api/process with invalid URL returns error', async ({ request }) => {
    const response = await request.post('/api/process', {
      multipart: {
        gridLayout: '2x2',
        url: 'not-a-valid-url',
      },
    })
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })
})
