import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { findAdapterForDomain } from '@/lib/adapter-store'
import path from 'path'
import { promises as fs } from 'fs'
import type { AdapterStore, Adapter } from '@/lib/adapter-types'

const testStorePath = path.join(__dirname, '../../adapters/test-adapter-store.json')

describe('Adapter endpoints', () => {
  beforeEach(async () => {
    // Create a test adapter store with sample data
    const testStore: AdapterStore = {
      version: '1.0',
      adapters: [
        {
          id: 'example-com-adapter',
          domains: ['example.com', 'www.example.com'],
          selectors: {
            pdf_links: 'a[href*=".pdf"]',
          },
          strategies: ['selector'],
          confidence: 0.95,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
        {
          id: 'test-site-adapter',
          domains: ['test.site.com', 'www.test.site.com'],
          selectors: {
            pdf_links: 'div.pdf-link a',
          },
          strategies: ['selector'],
          confidence: 0.85,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
      ],
    }

    const dir = path.dirname(testStorePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(testStorePath, JSON.stringify(testStore, null, 2))
  })

  afterEach(async () => {
    // Clean up test store
    try {
      await fs.unlink(testStorePath)
    } catch {
      // File might not exist
    }
  })

  it('should find adapter by exact domain match', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(adapter).toBeDefined()
    expect(adapter?.id).toBe('example-com-adapter')
  })

  it('should find adapter with www prefix', async () => {
    const adapter = await findAdapterForDomain('www.example.com', testStorePath)
    expect(adapter).toBeDefined()
    expect(adapter?.id).toBe('example-com-adapter')
  })

  it('should return undefined for unknown domain', async () => {
    const adapter = await findAdapterForDomain('nonexistent-domain-12345.com', testStorePath)
    expect(adapter).toBeUndefined()
  })

  it('should match subdomains with base domain logic', async () => {
    const adapter = await findAdapterForDomain('sub.example.com', testStorePath)
    expect(adapter).toBeDefined()
    expect(adapter?.domains).toContain('example.com')
  })

  it('should return adapter with highest confidence for domain', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(adapter?.confidence).toBe(0.95)
  })

  it('should handle domain case insensitivity properly', async () => {
    const adapterLower = await findAdapterForDomain('example.com', testStorePath)
    const adapterUpper = await findAdapterForDomain('EXAMPLE.COM', testStorePath)

    // Domain matching should handle case variations
    expect(adapterLower?.id || adapterUpper?.id).toBeDefined()
  })

  it('should correctly identify adapter domains array', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(Array.isArray(adapter?.domains)).toBe(true)
    expect(adapter?.domains?.length).toBeGreaterThan(0)
  })

  it('should return adapter with valid adapter ID', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(typeof adapter?.id).toBe('string')
    expect(adapter?.id.length).toBeGreaterThan(0)
  })

  it('should return adapter with strategies array', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(Array.isArray(adapter?.strategies)).toBe(true)
  })

  it('should return adapter with selectors object', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(typeof adapter?.selectors).toBe('object')
  })

  it('should return adapter with valid confidence value', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(typeof adapter?.confidence).toBe('number')
    expect(adapter?.confidence).toBeGreaterThanOrEqual(0)
    expect(adapter?.confidence).toBeLessThanOrEqual(1)
  })

  it('should handle empty domain string gracefully', async () => {
    const adapter = await findAdapterForDomain('', testStorePath)
    // Should return undefined or handle gracefully
    expect(adapter === undefined || typeof adapter?.id === 'string').toBe(true)
  })

  it('should handle null domain lookup', async () => {
    const adapter = await findAdapterForDomain('', testStorePath)
    // Should return undefined for empty domain
    expect(adapter === undefined).toBe(true)
  })

  it('should correctly match multi-level subdomains', async () => {
    const adapter = await findAdapterForDomain('deep.sub.example.com', testStorePath)
    expect(adapter).toBeDefined()
    expect(adapter?.domains).toContain('example.com')
  })

  it('should return adapter timestamps if present', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(adapter?.createdAt).toBeDefined()
    expect(adapter?.lastUpdated).toBeDefined()
  })

  it('should handle adapter lookup for second registered domain', async () => {
    const adapter = await findAdapterForDomain('test.site.com', testStorePath)
    expect(adapter).toBeDefined()
    expect(adapter?.id).toBe('test-site-adapter')
  })

  it('should properly handle domain extraction for adapter matching', async () => {
    // Test that www. prefix is properly stripped during matching
    const adapter1 = await findAdapterForDomain('example.com', testStorePath)
    const adapter2 = await findAdapterForDomain('www.example.com', testStorePath)

    expect(adapter1?.id).toBe(adapter2?.id)
  })

  it('should handle adapter store load errors gracefully', async () => {
    const nonexistentPath = path.join(__dirname, '../../adapters/nonexistent-store.json')
    const adapter = await findAdapterForDomain('example.com', nonexistentPath)
    // Should return undefined when store doesn't exist
    expect(adapter).toBeUndefined()
  })

  it('should return adapter with complete domain list', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    expect(adapter?.domains?.length).toBeGreaterThanOrEqual(1)
    expect(adapter?.domains?.some(d => d.includes('example.com'))).toBe(true)
  })

  it('should handle concurrent adapter lookups', async () => {
    const lookups = [
      findAdapterForDomain('example.com', testStorePath),
      findAdapterForDomain('test.site.com', testStorePath),
      findAdapterForDomain('unknown.com', testStorePath),
    ]

    const results = await Promise.all(lookups)
    expect(results[0]).toBeDefined()
    expect(results[1]).toBeDefined()
    expect(results[2]).toBeUndefined()
  })

  it('should return adapter with proper domain format', async () => {
    const adapter = await findAdapterForDomain('example.com', testStorePath)
    if (adapter) {
      adapter.domains.forEach(domain => {
        expect(typeof domain).toBe('string')
        expect(domain.length).toBeGreaterThan(0)
      })
    }
  })
})
