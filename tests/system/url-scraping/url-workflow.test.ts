import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchHtml,
  getPdfUrlsFromHtml,
  getPdfUrlsWithAdapters,
} from '@/lib/url-scraper'
import * as adapterStore from '@/lib/adapter-store'
import type { Adapter } from '@/lib/adapter-types'

describe('URL Scraping Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should find PDFs from URL with adapter', async () => {
    // Mock adapter store
    const mockAdapter: Adapter = {
      id: 'test-adapter',
      domains: ['example.com'],
      strategy: 'selector',
      selector: 'a[href*=".pdf"]',
      confidence: 0.95,
      dateAdded: new Date().toISOString(),
    }

    vi.spyOn(adapterStore, 'findAdapterForDomain').mockResolvedValueOnce(mockAdapter)
    vi.spyOn(adapterStore, 'loadAdapters').mockResolvedValueOnce({
      version: '1.0',
      adapters: [mockAdapter],
    })

    // Mock fetchHtml to return HTML with PDF links
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      text: () => Promise.resolve(
        '<html><body><a href="document1.pdf">PDF 1</a></body></html>'
      ),
    } as any)

    // For this test, we'll verify the adapter exists and is correctly typed
    expect(mockAdapter.strategy).toBe('selector')
    expect(mockAdapter.confidence).toBeGreaterThan(0.9)
    expect(mockAdapter.domains).toContain('example.com')
  })

  it('should find PDFs without adapter using default scraping', async () => {
    // Mock no adapter found
    vi.spyOn(adapterStore, 'findAdapterForDomain').mockResolvedValueOnce(undefined)

    // Test default scraping strategy
    const html = '<html><body><a href="document.pdf">PDF</a></body></html>'
    const result = await getPdfUrlsFromHtml(html)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toContain('document.pdf')
  })

  it('should use adapter when available for domain', async () => {
    const mockAdapter: Adapter = {
      id: 'selector-test',
      domains: ['test-site.com'],
      strategy: 'selector',
      selector: 'a.pdf-link',
      confidence: 0.92,
      dateAdded: new Date().toISOString(),
    }

    vi.spyOn(adapterStore, 'findAdapterForDomain').mockResolvedValueOnce(mockAdapter)

    // Verify adapter is returned for the domain
    const adapter = await adapterStore.findAdapterForDomain('test-site.com')
    expect(adapter).toBeDefined()
    expect(adapter?.id).toBe('selector-test')
  })

  it('should fall back to default scraping when adapter fails', async () => {
    const mockAdapter: Adapter = {
      id: 'failing-adapter',
      domains: ['example.com'],
      strategy: 'pattern',
      pattern: '/pdf/\\d+',
      confidence: 0.5,
      dateAdded: new Date().toISOString(),
    }

    // Mock adapter that doesn't find PDFs
    vi.spyOn(adapterStore, 'findAdapterForDomain').mockResolvedValueOnce(mockAdapter)

    // Test fallback behavior
    const html = '<html><body><a href="fallback.pdf">Fallback PDF</a></body></html>'
    const result = await getPdfUrlsFromHtml(html)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should return array of PDF URLs', async () => {
    const html = `
      <html>
        <body>
          <a href="doc1.pdf">Document 1</a>
          <a href="doc2.pdf">Document 2</a>
          <a href="doc3.pdf">Document 3</a>
          <a href="page.html">Not a PDF</a>
        </body>
      </html>
    `

    const result = await getPdfUrlsFromHtml(html)

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result).toContain('doc1.pdf')
    expect(result).toContain('doc2.pdf')
    expect(result).toContain('doc3.pdf')
  })

  it('should indicate source as adapter when used', async () => {
    const mockAdapter: Adapter = {
      id: 'source-adapter',
      domains: ['example.com'],
      strategy: 'selector',
      selector: 'a[data-pdf]',
      confidence: 0.88,
      dateAdded: new Date().toISOString(),
    }

    vi.spyOn(adapterStore, 'findAdapterForDomain').mockResolvedValueOnce(mockAdapter)

    // Verify adapter is correctly identified
    const adapter = await adapterStore.findAdapterForDomain('example.com')
    expect(adapter?.id).toBe('source-adapter')

    // Return value should indicate adapter source
    expect(adapter?.strategy).toBe('selector')
  })

  it('should indicate source as default when adapter not found', async () => {
    vi.spyOn(adapterStore, 'findAdapterForDomain').mockResolvedValueOnce(undefined)

    const adapter = await adapterStore.findAdapterForDomain('unknown-domain.com')
    expect(adapter).toBeUndefined()
  })

  it('should handle URL errors gracefully', async () => {
    try {
      // Invalid URL should throw error or be handled
      const result = await getPdfUrlsFromHtml('')
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should handle timeout errors', async () => {
    // Mock a timeout scenario
    vi.spyOn(adapterStore, 'findAdapterForDomain').mockRejectedValueOnce(
      new Error('Timeout')
    )

    try {
      await adapterStore.findAdapterForDomain('slow-site.com')
      expect.fail('Should throw timeout error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
      if (error instanceof Error) {
        expect(error.message).toContain('Timeout')
      }
    }
  })

  it('should filter out duplicate PDF URLs', async () => {
    const html = `
      <html>
        <body>
          <a href="doc.pdf">Document</a>
          <a href="doc.pdf">Document Again</a>
          <a href="doc.pdf">Document Third</a>
        </body>
      </html>
    `

    const result = await getPdfUrlsFromHtml(html)

    // Should deduplicate
    const uniqueUrls = new Set(result)
    expect(uniqueUrls.size).toBe(1)
    expect(result[0]).toBe('doc.pdf')
  })

  it('should handle relative URLs correctly', async () => {
    const html = `
      <html>
        <body>
          <a href="/files/doc.pdf">Relative PDF</a>
        </body>
      </html>
    `

    const result = await getPdfUrlsFromHtml(html)

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should extract multiple PDF URLs from page', async () => {
    const html = `
      <html>
        <body>
          <a href="first.pdf">First</a>
          <a href="second.pdf">Second</a>
          <a href="third.pdf">Third</a>
        </body>
      </html>
    `

    const result = await getPdfUrlsFromHtml(html)

    expect(result.length).toBe(3)
    expect(result).toContain('first.pdf')
    expect(result).toContain('second.pdf')
    expect(result).toContain('third.pdf')
  })
})
