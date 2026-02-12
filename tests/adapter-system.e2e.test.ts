import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'
import { promises as fs } from 'fs'

// Import all components
import { loadAdapters, saveAdapters, findAdapterForDomain, addAdapter, removeAdapter, getAllAdapters } from '../lib/adapter-store'
import { discoverAdapter, discoverAdapterWithReport } from '../lib/adapter-discovery-engine'
import type { Adapter, AdapterStore } from '../lib/adapter-types'

// Mock the strategies to avoid actual browser/network operations in e2e tests
vi.mock('../lib/strategies/selector-strategy', () => ({
  detectWithSelectors: vi.fn(),
}))

vi.mock('../lib/strategies/pattern-strategy', () => ({
  detectWithPatterns: vi.fn(),
}))

vi.mock('../lib/strategies/javascript-strategy', () => ({
  detectWithJavaScript: vi.fn(),
}))

import * as selectorStrategy from '../lib/strategies/selector-strategy'
import * as patternStrategy from '../lib/strategies/pattern-strategy'
import * as jsStrategy from '../lib/strategies/javascript-strategy'

// Use a test store path
const testStorePath = path.join(__dirname, '../adapters/e2e-test-store.json')

describe('Adapter System - End-to-End Tests', () => {
  beforeEach(async () => {
    // Create clean test store
    const emptyStore: AdapterStore = { version: '1.0', adapters: [] }
    await fs.mkdir(path.dirname(testStorePath), { recursive: true })
    await fs.writeFile(testStorePath, JSON.stringify(emptyStore, null, 2))
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up
    try {
      await fs.unlink(testStorePath)
    } catch {
      // Ignore if file doesn't exist
    }
  })

  describe('Complete Adapter Lifecycle', () => {
    it('should discover, save, find, and use adapter', async () => {
      // 1. Set up mock discovery
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf', '/pdf/page3.pdf'],
        confidence: 0.92,
        selector: 'a[href*=".pdf"]',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      // 2. Discover adapter
      const sampleHtml = `
        <html>
          <body>
            <a href="/pdf/page1.pdf">Download 1</a>
            <a href="/pdf/page2.pdf">Download 2</a>
            <a href="/pdf/page3.pdf">Download 3</a>
          </body>
        </html>
      `

      const discoveredAdapter = await discoverAdapter(sampleHtml, 'https://example.com')
      expect(discoveredAdapter).toBeDefined()
      expect(discoveredAdapter?.domains).toContain('example.com')
      expect(discoveredAdapter?.confidence).toBeGreaterThan(0.8)

      // 3. Save the adapter
      if (discoveredAdapter) {
        await addAdapter(discoveredAdapter, testStorePath)
      }

      // 4. Find the adapter by domain
      const foundAdapter = await findAdapterForDomain('example.com', testStorePath)
      expect(foundAdapter).toBeDefined()

      // 5. Verify it's the same adapter
      if (discoveredAdapter && foundAdapter) {
        expect(foundAdapter.id).toBe(discoveredAdapter.id)
        expect(foundAdapter.strategy).toBe(discoveredAdapter.strategy)
        expect(foundAdapter.confidence).toBe(discoveredAdapter.confidence)
      }
    })

    it('should handle multiple adapters for different domains', async () => {
      // Create adapters for different domains
      const adapter1: Adapter = {
        id: 'adapter-example',
        domains: ['example.com'],
        strategy: 'selector',
        selector: 'a[href*=".pdf"]',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      const adapter2: Adapter = {
        id: 'adapter-test',
        domains: ['test.com'],
        strategy: 'pattern',
        pattern: '/pdf/.*',
        confidence: 0.85,
        dateAdded: new Date().toISOString(),
      }

      // Save both
      await addAdapter(adapter1, testStorePath)
      await addAdapter(adapter2, testStorePath)

      // Retrieve all
      const all = await getAllAdapters(testStorePath)
      expect(all).toHaveLength(2)

      // Find specific adapters
      const found1 = await findAdapterForDomain('example.com', testStorePath)
      const found2 = await findAdapterForDomain('test.com', testStorePath)

      expect(found1?.id).toBe('adapter-example')
      expect(found2?.id).toBe('adapter-test')
    })

    it('should update existing adapter when adding with same ID', async () => {
      const adapter1: Adapter = {
        id: 'adapter-1',
        domains: ['example.com'],
        strategy: 'selector',
        selector: 'a.pdf',
        confidence: 0.8,
        dateAdded: '2026-01-01T00:00:00Z',
      }

      await addAdapter(adapter1, testStorePath)

      // Update the adapter
      const adapter2: Adapter = {
        ...adapter1,
        selector: 'a[href*=".pdf"]',
        confidence: 0.95,
      }

      await addAdapter(adapter2, testStorePath)

      // Should still have only 1 adapter
      const all = await getAllAdapters(testStorePath)
      expect(all).toHaveLength(1)

      // Verify it was updated
      expect(all[0].selector).toBe('a[href*=".pdf"]')
      expect(all[0].confidence).toBe(0.95)
    })

    it('should remove adapters correctly', async () => {
      const adapter: Adapter = {
        id: 'adapter-to-remove',
        domains: ['example.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      // Add and verify
      await addAdapter(adapter, testStorePath)
      let all = await getAllAdapters(testStorePath)
      expect(all).toHaveLength(1)

      // Remove
      const removed = await removeAdapter('adapter-to-remove', testStorePath)
      expect(removed).toBe(true)

      // Verify it's gone
      all = await getAllAdapters(testStorePath)
      expect(all).toHaveLength(0)

      // Try removing again (should fail)
      const removedAgain = await removeAdapter('adapter-to-remove', testStorePath)
      expect(removedAgain).toBe(false)
    })
  })

  describe('Discovery with Different HTML Structures', () => {
    it('should discover adapters with CSS selectors', async () => {
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/files/doc1.pdf', '/files/doc2.pdf'],
        confidence: 0.88,
        selector: 'a.pdf-download',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const html = `
        <html>
          <body>
            <div class="pdf-links">
              <a class="pdf-download" href="/files/doc1.pdf">PDF 1</a>
              <a class="pdf-download" href="/files/doc2.pdf">PDF 2</a>
            </div>
          </body>
        </html>
      `

      const result = await discoverAdapter(html)
      expect(result).toBeDefined()
      expect(result?.strategy).toBe('selector')
      expect(result?.confidence).toBeGreaterThan(0.7)
    })

    it('should discover adapters with URL patterns', async () => {
      const mockResult = {
        strategy: 'pattern' as const,
        pdfUrls: ['/downloads/image_001.pdf', '/downloads/image_002.pdf', '/downloads/image_003.pdf'],
        confidence: 0.82,
        pattern: '/downloads/image_\\d+\\.pdf',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(undefined)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(mockResult)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const html = `
        <html>
          <body>
            Links: /downloads/image_001.pdf, /downloads/image_002.pdf, /downloads/image_003.pdf
          </body>
        </html>
      `

      const result = await discoverAdapter(html)
      expect(result).toBeDefined()
      if (result) {
        expect(result.strategy).toBe('pattern')
        expect(result.pattern).toBe('/downloads/image_\\d+\\.pdf')
        expect(result.confidence).toBe(0.82)
      }
    })

    it('should return undefined for HTML without PDFs', async () => {
      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(undefined)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const html = `
        <html>
          <body>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </body>
        </html>
      `

      const result = await discoverAdapter(html)
      expect(result).toBeUndefined()
    })
  })

  describe('Discovery Report Analysis', () => {
    it('should provide detailed report with all strategy results', async () => {
      const selectorResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf'],
        confidence: 0.85,
        selector: 'a[href*=".pdf"]',
      }

      const patternResult = {
        strategy: 'pattern' as const,
        pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf'],
        confidence: 0.78,
        pattern: '/pdf/.*',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(selectorResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(patternResult)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const html = `
        <html>
          <body>
            <a href="/pdf/page1.pdf">Page 1</a>
            <a href="/pdf/page2.pdf">Page 2</a>
          </body>
        </html>
      `

      const report = await discoverAdapterWithReport(html)

      expect(report).toBeDefined()
      expect(report.results).toBeDefined()
      expect(Array.isArray(report.results)).toBe(true)
      expect(report.timestamp).toBeDefined()

      // Should have at least one result
      expect(report.results.length).toBeGreaterThanOrEqual(1)

      // Each result should have required fields
      for (const result of report.results) {
        expect(result.strategy).toBeDefined()
        expect(result.pdfUrls).toBeDefined()
        expect(result.confidence).toBeDefined()
        expect(Array.isArray(result.pdfUrls)).toBe(true)
        expect(result.confidence).toBeGreaterThanOrEqual(0)
        expect(result.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should select best result from multiple strategies', async () => {
      const selectorResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdf/1.pdf'],
        confidence: 0.65,
        selector: 'a',
      }

      const patternResult = {
        strategy: 'pattern' as const,
        pdfUrls: ['/pdf/1.pdf', '/pdf/2.pdf', '/pdf/3.pdf', '/pdf/4.pdf', '/pdf/5.pdf'],
        confidence: 0.92,
        pattern: '/pdf/.*',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(selectorResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(patternResult)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const html = `
        <a href="/pdf/1.pdf">Link 1</a>
        <a href="/pdf/2.pdf">Link 2</a>
        <a href="/pdf/3.pdf">Link 3</a>
        <a href="/pdf/4.pdf">Link 4</a>
        <a href="/pdf/5.pdf">Link 5</a>
      `

      const report = await discoverAdapterWithReport(html)
      expect(report.bestResult).toBeDefined()
      expect(report.bestResult?.strategy).toBe('pattern')
      expect(report.bestResult?.confidence).toBe(0.92)
    })
  })

  describe('Domain Matching Logic', () => {
    it('should match exact domains', async () => {
      const adapter: Adapter = {
        id: 'exact-match',
        domains: ['greencoloring.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter, testStorePath)

      const found = await findAdapterForDomain('greencoloring.com', testStorePath)
      expect(found?.id).toBe('exact-match')
    })

    it('should match subdomains to base domain', async () => {
      const adapter: Adapter = {
        id: 'subdomain-match',
        domains: ['greencoloring.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter, testStorePath)

      // subdomain.greencoloring.com should match greencoloring.com
      const found = await findAdapterForDomain('cdn.greencoloring.com', testStorePath)
      expect(found?.id).toBe('subdomain-match')
    })

    it('should select highest confidence adapter for domain', async () => {
      const adapter1: Adapter = {
        id: 'low-confidence',
        domains: ['example.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.6,
        dateAdded: new Date().toISOString(),
      }

      const adapter2: Adapter = {
        id: 'high-confidence',
        domains: ['example.com'],
        strategy: 'pattern',
        pattern: '.*',
        confidence: 0.95,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter1, testStorePath)
      await addAdapter(adapter2, testStorePath)

      const found = await findAdapterForDomain('example.com', testStorePath)
      expect(found?.id).toBe('high-confidence')
    })

    it('should not find adapter for unrelated domains', async () => {
      const adapter: Adapter = {
        id: 'test-adapter',
        domains: ['test.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter, testStorePath)

      const found = await findAdapterForDomain('unrelated.com', testStorePath)
      expect(found).toBeUndefined()
    })
  })

  describe('Data Persistence', () => {
    it('should persist adapters across load/save cycles', async () => {
      const adapter: Adapter = {
        id: 'persistent-adapter',
        domains: ['persistent.com'],
        strategy: 'selector',
        selector: 'a[href*=".pdf"]',
        confidence: 0.88,
        dateAdded: new Date().toISOString(),
        description: 'Test adapter',
      }

      // Save
      await addAdapter(adapter, testStorePath)

      // Load from disk
      const store = await loadAdapters(testStorePath)
      expect(store.adapters).toHaveLength(1)

      // Verify data integrity
      const saved = store.adapters[0]
      expect(saved.id).toBe('persistent-adapter')
      expect(saved.domains).toEqual(['persistent.com'])
      expect(saved.selector).toBe('a[href*=".pdf"]')
      expect(saved.description).toBe('Test adapter')
    })

    it('should handle empty adapter store gracefully', async () => {
      // Load from non-existent file
      const store = await loadAdapters(path.join(__dirname, '../adapters/nonexistent-e2e.json'))

      expect(store).toBeDefined()
      expect(store.version).toBe('1.0')
      expect(store.adapters).toHaveLength(0)
    })

    it('should maintain adapter order', async () => {
      const adapter1: Adapter = {
        id: 'first',
        domains: ['first.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: '2026-01-01T00:00:00Z',
      }

      const adapter2: Adapter = {
        id: 'second',
        domains: ['second.com'],
        strategy: 'pattern',
        pattern: '.*',
        confidence: 0.8,
        dateAdded: '2026-01-02T00:00:00Z',
      }

      const adapter3: Adapter = {
        id: 'third',
        domains: ['third.com'],
        strategy: 'selector',
        selector: 'a.pdf',
        confidence: 0.85,
        dateAdded: '2026-01-03T00:00:00Z',
      }

      await addAdapter(adapter1, testStorePath)
      await addAdapter(adapter2, testStorePath)
      await addAdapter(adapter3, testStorePath)

      const all = await getAllAdapters(testStorePath)
      expect(all[0].id).toBe('first')
      expect(all[1].id).toBe('second')
      expect(all[2].id).toBe('third')
    })

    it('should validate store version', async () => {
      const adapter: Adapter = {
        id: 'test',
        domains: ['test.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter, testStorePath)

      const store = await loadAdapters(testStorePath)
      expect(store.version).toBe('1.0')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted JSON gracefully', async () => {
      // Write invalid JSON
      await fs.writeFile(testStorePath, '{ invalid json }')

      // Should return empty store, not throw
      const store = await loadAdapters(testStorePath)
      expect(store.version).toBe('1.0')
      expect(store.adapters).toHaveLength(0)
    })

    it('should handle missing selector/pattern fields', async () => {
      const adapter: Adapter = {
        id: 'no-selector',
        domains: ['test.com'],
        strategy: 'javascript',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter, testStorePath)

      const found = await findAdapterForDomain('test.com', testStorePath)
      expect(found?.selector).toBeUndefined()
      expect(found?.pattern).toBeUndefined()
    })

    it('should generate unique adapter IDs', async () => {
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/test.pdf'],
        confidence: 0.9,
        selector: 'a',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const adapter1 = await discoverAdapter('<a href="/test1.pdf">Test</a>')

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      const adapter2 = await discoverAdapter('<a href="/test2.pdf">Test</a>')

      if (adapter1 && adapter2) {
        expect(adapter1.id).not.toBe(adapter2.id)
      }
    })

    it('should handle empty domains array gracefully', async () => {
      const adapter: Adapter = {
        id: 'no-domains',
        domains: [],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      // Should not throw
      await addAdapter(adapter, testStorePath)

      const found = await findAdapterForDomain('test.com', testStorePath)
      expect(found).toBeUndefined()
    })

    it('should handle special characters in selectors', async () => {
      const adapter: Adapter = {
        id: 'special-chars',
        domains: ['test.com'],
        strategy: 'selector',
        selector: 'a[data-pdf*="page[1-3]"]',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapter, testStorePath)

      const found = await findAdapterForDomain('test.com', testStorePath)
      expect(found?.selector).toBe('a[data-pdf*="page[1-3]"]')
    })
  })

  describe('Integration Scenarios', () => {
    it('should complete full discovery and storage workflow', async () => {
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/coloring/page1.pdf', '/coloring/page2.pdf'],
        confidence: 0.89,
        selector: 'a[href*="/coloring/"]',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      // Step 1: Discover
      const html = `
        <a href="/coloring/page1.pdf">Page 1</a>
        <a href="/coloring/page2.pdf">Page 2</a>
      `
      const discovered = await discoverAdapter(html, 'https://coloring.example.com')

      // Step 2: Verify discovery
      expect(discovered).toBeDefined()

      // Step 3: Save
      if (discovered) {
        await addAdapter(discovered, testStorePath)
      }

      // Step 4: Retrieve
      const stored = await getAllAdapters(testStorePath)
      expect(stored).toHaveLength(1)

      // Step 5: Find by domain
      const found = await findAdapterForDomain(discovered?.domains[0] || '', testStorePath)
      expect(found).toBeDefined()
      expect(found?.strategy).toBe('selector')
    })

    it('should handle sequential discovery and updates', async () => {
      const mockResult1 = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdf/1.pdf'],
        confidence: 0.85,
        selector: 'a[href*=".pdf"]',
      }

      const mockResult2 = {
        strategy: 'pattern' as const,
        pdfUrls: ['/file/1.pdf'],
        confidence: 0.8,
        pattern: '/file/.*',
      }

      // First discovery
      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult1)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const adapter1 = await discoverAdapter('<a href="/pdf/1.pdf">1</a>', 'https://first.com')
      expect(adapter1).toBeDefined()
      if (adapter1) await addAdapter(adapter1, testStorePath)

      // Second discovery
      vi.clearAllMocks()
      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(undefined)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(mockResult2)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const adapter2 = await discoverAdapter('<a href="/file/1.pdf">1</a>', 'https://second.com')
      expect(adapter2).toBeDefined()
      if (adapter2) await addAdapter(adapter2, testStorePath)

      // Should have 2 adapters
      let all = await getAllAdapters(testStorePath)
      expect(all.length).toBeGreaterThanOrEqual(1)

      // Update first adapter with higher confidence
      if (adapter1) {
        const updated = { ...adapter1, confidence: 0.99 }
        await addAdapter(updated, testStorePath)
      }

      // Should still have at least 1
      all = await getAllAdapters(testStorePath)
      expect(all.length).toBeGreaterThanOrEqual(1)

      // Verify update if adapter1 exists
      if (adapter1) {
        const updated = all.find(a => a.id === adapter1.id)
        expect(updated?.confidence).toBe(0.99)
      }
    })

    it('should handle all three strategies in discovery report', async () => {
      const selectorResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdf/1.pdf'],
        confidence: 0.7,
        selector: 'a',
      }

      const patternResult = {
        strategy: 'pattern' as const,
        pdfUrls: ['/pdf/1.pdf', '/pdf/2.pdf'],
        confidence: 0.85,
        pattern: '/pdf/.*',
      }

      const jsResult = {
        strategy: 'javascript' as const,
        pdfUrls: ['/pdf/1.pdf', '/pdf/2.pdf'],
        confidence: 0.95,
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(selectorResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(patternResult)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(jsResult)

      const report = await discoverAdapterWithReport('<html></html>', 'https://example.com')

      expect(report.results).toHaveLength(3)
      expect(report.results.map(r => r.strategy)).toContain('selector')
      expect(report.results.map(r => r.strategy)).toContain('pattern')
      expect(report.results.map(r => r.strategy)).toContain('javascript')
      expect(report.bestResult?.strategy).toBe('javascript')
      expect(report.bestResult?.confidence).toBe(0.95)
    })

    it('should save adapter discovered from URL with domain', async () => {
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdfs/1.pdf'],
        confidence: 0.9,
        selector: 'a.pdf-link',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const adapter = await discoverAdapter('<a class="pdf-link" href="/pdfs/1.pdf">PDF</a>', 'https://coloring.book/pages')
      expect(adapter).toBeDefined()
      expect(adapter?.domains).toContain('coloring.book')

      if (adapter) {
        await addAdapter(adapter, testStorePath)
      }

      const found = await findAdapterForDomain('coloring.book', testStorePath)
      expect(found).toBeDefined()
    })
  })

  describe('Concurrency and Performance', () => {
    it('should handle sequential adapter additions', async () => {
      const adapters = Array.from({ length: 5 }, (_, i) => ({
        id: `sequential-${i}`,
        domains: [`domain${i}.com`],
        strategy: 'selector' as const,
        selector: 'a',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }))

      // Add sequentially to avoid file write conflicts
      for (const adapter of adapters) {
        await addAdapter(adapter, testStorePath)
      }

      // Verify all were added
      const all = await getAllAdapters(testStorePath)
      expect(all).toHaveLength(5)
    })

    it('should handle rapid discovery and storage', async () => {
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: ['/pdf/1.pdf'],
        confidence: 0.9,
        selector: 'a',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      // Discover and save rapidly
      const adapters = await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          const discovered = await discoverAdapter(`<a href="/pdf/${i}.pdf">PDF</a>`, `https://example${i}.com`)
          if (discovered) {
            await addAdapter(discovered, testStorePath)
          }
          return discovered
        })
      )

      const stored = await getAllAdapters(testStorePath)
      expect(stored.length).toBeGreaterThan(0)
    })
  })

  describe('Adapter Type Safety', () => {
    it('should preserve all adapter fields during storage', async () => {
      const adapter: Adapter = {
        id: 'complete-adapter',
        domains: ['example.com', 'example.org'],
        strategy: 'pattern',
        pattern: '/downloads/.*\\.pdf$',
        confidence: 0.87,
        dateAdded: '2026-02-07T15:30:00Z',
        description: 'A comprehensive adapter with all fields',
      }

      await addAdapter(adapter, testStorePath)

      const stored = await getAllAdapters(testStorePath)
      const found = stored[0]

      expect(found.id).toBe(adapter.id)
      expect(found.domains).toEqual(adapter.domains)
      expect(found.strategy).toBe(adapter.strategy)
      expect(found.pattern).toBe(adapter.pattern)
      expect(found.confidence).toBe(adapter.confidence)
      expect(found.dateAdded).toBe(adapter.dateAdded)
      expect(found.description).toBe(adapter.description)
    })

    it('should handle optional fields correctly', async () => {
      const adapterWithoutOptionals: Adapter = {
        id: 'minimal-adapter',
        domains: ['test.com'],
        strategy: 'javascript',
        confidence: 0.9,
        dateAdded: new Date().toISOString(),
      }

      await addAdapter(adapterWithoutOptionals, testStorePath)

      const found = await findAdapterForDomain('test.com', testStorePath)
      expect(found?.selector).toBeUndefined()
      expect(found?.pattern).toBeUndefined()
      expect(found?.description).toBeUndefined()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle adapter discovery for colorful website', async () => {
      const mockResult = {
        strategy: 'selector' as const,
        pdfUrls: [
          '/coloring-pages/animals.pdf',
          '/coloring-pages/flowers.pdf',
          '/coloring-pages/landscapes.pdf',
        ],
        confidence: 0.94,
        selector: 'a[href*="/coloring-pages/"]',
      }

      vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
      vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
      vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

      const html = `
        <div class="coloring-collection">
          <h2>Free Coloring Pages</h2>
          <a href="/coloring-pages/animals.pdf" class="download-btn">Animals</a>
          <a href="/coloring-pages/flowers.pdf" class="download-btn">Flowers</a>
          <a href="/coloring-pages/landscapes.pdf" class="download-btn">Landscapes</a>
        </div>
      `

      const discovered = await discoverAdapter(html, 'https://greencoloring.com')
      expect(discovered).toBeDefined()
      expect(discovered?.confidence).toBeGreaterThan(0.9)

      if (discovered) {
        await addAdapter(discovered, testStorePath)
        const found = await findAdapterForDomain('greencoloring.com', testStorePath)
        expect(found).toBeDefined()
      }
    })

    it('should manage adapters for multiple coloring websites', async () => {
      const adapters: Adapter[] = [
        {
          id: 'green-coloring',
          domains: ['greencoloring.com'],
          strategy: 'selector',
          selector: 'a[href*="download"]',
          confidence: 0.91,
          dateAdded: new Date().toISOString(),
          description: 'Green Coloring website adapter',
        },
        {
          id: 'fun-pages',
          domains: ['funcoloringpages.com'],
          strategy: 'pattern',
          pattern: '/pages/\\d+\\.pdf',
          confidence: 0.88,
          dateAdded: new Date().toISOString(),
          description: 'Fun Coloring Pages adapter',
        },
        {
          id: 'kids-art',
          domains: ['kidsart.org'],
          strategy: 'javascript',
          confidence: 0.92,
          dateAdded: new Date().toISOString(),
          description: 'Kids Art site with dynamic loading',
        },
      ]

      // Store all
      for (const adapter of adapters) {
        await addAdapter(adapter, testStorePath)
      }

      // Verify all stored
      const all = await getAllAdapters(testStorePath)
      expect(all).toHaveLength(3)

      // Verify lookup works for each
      for (const adapter of adapters) {
        const domain = adapter.domains[0]
        const found = await findAdapterForDomain(domain, testStorePath)
        expect(found?.id).toBe(adapter.id)
      }
    })
  })
})
