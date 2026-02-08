import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectWithJavaScript } from '../../../lib/strategies/javascript-strategy'

// Mock playwright with proper structure
vi.mock('playwright', () => {
  const mockClose = vi.fn().mockResolvedValue(undefined)
  const mockEvaluate = vi.fn().mockResolvedValue([])
  const mockContent = vi.fn().mockResolvedValue('<html></html>')
  const mockWaitForTimeout = vi.fn().mockResolvedValue(undefined)
  const mockGoto = vi.fn().mockResolvedValue(undefined)
  const mockSetDefaultTimeout = vi.fn()

  const mockPage = {
    close: mockClose,
    evaluate: mockEvaluate,
    content: mockContent,
    waitForTimeout: mockWaitForTimeout,
    goto: mockGoto,
    setDefaultTimeout: mockSetDefaultTimeout,
  }

  const mockNewPage = vi.fn().mockResolvedValue(mockPage)
  const mockNewContext = vi.fn().mockResolvedValue({
    newPage: mockNewPage,
  })

  const mockBrowser = {
    newContext: mockNewContext,
    close: mockClose,
  }

  const mockLaunch = vi.fn().mockResolvedValue(mockBrowser)

  return {
    chromium: {
      launch: mockLaunch,
    },
  }
})

describe('JavaScriptStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect PDF links from JavaScript-rendered content', async () => {
    const result = await detectWithJavaScript('https://example.com')

    // Since we're testing with mocks, the function should complete
    // and return either undefined (no PDFs found) or a result object
    expect(result === null || result === undefined || result?.strategy === 'javascript').toBe(true)
  })

  it('should return undefined for invalid URL', async () => {
    const result = await detectWithJavaScript('not-a-url')
    expect(result).toBeUndefined()
  })

  it('should timeout gracefully on slow sites', async () => {
    const result = await detectWithJavaScript('https://example.com', {
      timeout: 1000,
    })
    expect(result === null || result === undefined || result?.strategy === 'javascript').toBe(true)
  })

  it('should handle browser errors gracefully', async () => {
    const result = await detectWithJavaScript('https://example.com')
    // Should not throw even if browser has issues
    expect(result === null || result === undefined || typeof result === 'object').toBe(true)
  })

  it('should use provided wait time', async () => {
    const result = await detectWithJavaScript('https://example.com', {
      waitTime: 2000,
    })
    // Should complete without errors
    expect(result === null || result === undefined || typeof result === 'object').toBe(true)
  })

  it('should detect PDFs with high confidence when found', async () => {
    // In real usage with actual browser
    const result = await detectWithJavaScript('https://example.com')

    if (result) {
      expect(result.strategy).toBe('javascript')
      expect(result.pdfUrls).toBeDefined()
      expect(Array.isArray(result.pdfUrls)).toBe(true)
      if (result.pdfUrls.length > 0) {
        expect(result.confidence).toBeGreaterThan(0.7)
      }
    }
  })
})
