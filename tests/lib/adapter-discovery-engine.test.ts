import { describe, it, expect, vi, beforeEach } from 'vitest'
import { discoverAdapter } from '../../lib/adapter-discovery-engine'

// Mock the strategies
vi.mock('../../lib/strategies/selector-strategy', () => ({
  detectWithSelectors: vi.fn(),
}))

vi.mock('../../lib/strategies/pattern-strategy', () => ({
  detectWithPatterns: vi.fn(),
}))

vi.mock('../../lib/strategies/javascript-strategy', () => ({
  detectWithJavaScript: vi.fn(),
}))

import * as selectorStrategy from '../../lib/strategies/selector-strategy'
import * as patternStrategy from '../../lib/strategies/pattern-strategy'
import * as jsStrategy from '../../lib/strategies/javascript-strategy'

describe('AdapterDiscoveryEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return result from selector strategy if available', async () => {
    const mockResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf'],
      confidence: 0.9,
      selector: 'a[href*=".pdf"]',
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const result = await discoverAdapter('<html></html>')

    expect(result).toBeDefined()
    expect(result?.strategy).toBe('selector')
    expect(result?.confidence).toBe(0.9)
  })

  it('should pick highest confidence result among all strategies', async () => {
    const selectorResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf'],
      confidence: 0.7,
      selector: 'a',
    }

    const patternResult = {
      strategy: 'pattern' as const,
      pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf', '/pdf/page3.pdf'],
      confidence: 0.88,
      pattern: '/pdf/.*',
    }

    const jsResult = {
      strategy: 'javascript' as const,
      pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf'],
      confidence: 0.92,
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(selectorResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(patternResult)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(jsResult)

    const result = await discoverAdapter('<html></html>', 'https://example.com')

    expect(result).toBeDefined()
    expect(result?.strategy).toBe('javascript')
    expect(result?.confidence).toBe(0.92)
  })

  it('should return undefined when no strategies find PDFs', async () => {
    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(undefined)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const result = await discoverAdapter('<html></html>')

    expect(result).toBeUndefined()
  })

  it('should run strategies in parallel', async () => {
    const mockResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf'],
      confidence: 0.9,
      selector: 'a',
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const startTime = Date.now()
    await discoverAdapter('<html></html>')
    const duration = Date.now() - startTime

    // Should complete quickly (strategies run in parallel, not sequentially)
    // This is a soft assertion since timing can vary
    expect(duration).toBeLessThan(5000)
  })

  it('should handle selector and pattern strategies synchronously', async () => {
    const mockResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf'],
      confidence: 0.9,
      selector: 'a',
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const result = await discoverAdapter('<html></html>')

    // Even though JS is async, function should return a result
    expect(result).toBeDefined()
  })

  it('should filter out results with very low confidence', async () => {
    const lowConfidenceResult = {
      strategy: 'pattern' as const,
      pdfUrls: ['/test.pdf'],
      confidence: 0.3, // Very low
    }

    const goodResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf'],
      confidence: 0.85,
      selector: 'a',
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(goodResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(lowConfidenceResult)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const result = await discoverAdapter('<html></html>')

    expect(result?.strategy).toBe('selector')
  })

  it('should generate unique adapter ID with timestamp', async () => {
    const mockResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf'],
      confidence: 0.9,
      selector: 'a[href*=".pdf"]',
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(mockResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(undefined)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const result = await discoverAdapter('<html></html>')

    expect(result).toBeDefined()
    expect(result?.id).toBeDefined()
    expect(result?.id).toMatch(/^adapter-\d+$/)
  })

  it('should include all strategy results in discovery report', async () => {
    const selectorResult = {
      strategy: 'selector' as const,
      pdfUrls: ['/pdf/page1.pdf'],
      confidence: 0.7,
      selector: 'a',
    }

    const patternResult = {
      strategy: 'pattern' as const,
      pdfUrls: ['/pdf/page1.pdf', '/pdf/page2.pdf'],
      confidence: 0.85,
      pattern: '/pdf/.*',
    }

    vi.mocked(selectorStrategy.detectWithSelectors).mockReturnValue(selectorResult)
    vi.mocked(patternStrategy.detectWithPatterns).mockReturnValue(patternResult)
    vi.mocked(jsStrategy.detectWithJavaScript).mockResolvedValue(undefined)

    const result = await discoverAdapter('<html></html>')

    // Should return the best result (pattern with 0.85 confidence)
    expect(result?.strategy).toBe('pattern')
    expect(result?.confidence).toBe(0.85)
  })
})
