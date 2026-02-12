import { chromium, Browser, Page } from 'playwright'
import type { DiscoveryResult } from '../adapter-types'

interface JavaScriptStrategyOptions {
  timeout?: number // Total timeout for browser operations (ms)
  waitTime?: number // Time to wait after page load for JS to render (ms)
  headless?: boolean // Run browser in headless mode (default: true)
}

/**
 * Validate URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString)
    return true
  } catch {
    return false
  }
}

/**
 * Extract PDF URLs from page using Playwright
 * This is the most sophisticated detection - it loads the page in a real browser
 * and waits for JavaScript to render content before looking for PDF links
 */
export async function detectWithJavaScript(
  url: string,
  options: JavaScriptStrategyOptions = {}
): Promise<DiscoveryResult | undefined> {
  const {
    timeout = 30000,
    waitTime = 3000,
    headless = true,
  } = options

  // Validate URL
  if (!isValidUrl(url)) {
    return undefined
  }

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Launch browser
    browser = await chromium.launch({ headless })
    const context = await browser.newContext()
    page = await context.newPage()

    // Set timeout for all operations
    page.setDefaultTimeout(timeout)

    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle', timeout })

    // Wait for JavaScript to finish rendering
    await page.waitForTimeout(waitTime)

    // Extract all href attributes that contain PDF links
    const pdfUrls = await page.evaluate(() => {
      const urls = new Set<string>()
      const links = document.querySelectorAll('a[href*=".pdf"]')

      for (const link of links) {
        const href = link.getAttribute('href')
        if (href && href.includes('.pdf')) {
          // Convert relative URLs to absolute
          if (href.startsWith('http')) {
            urls.add(href)
          } else if (href.startsWith('/')) {
            const baseUrl = window.location.origin
            urls.add(`${baseUrl}${href}`)
          } else {
            const baseUrl = window.location.href.split('/').slice(0, -1).join('/')
            urls.add(`${baseUrl}/${href}`)
          }
        }
      }

      // Also check data attributes for PDF URLs
      const dataElements = document.querySelectorAll('[data-pdf-url], [data-pdf-link]')
      for (const element of dataElements) {
        const url = element.getAttribute('data-pdf-url') || element.getAttribute('data-pdf-link')
        if (url && url.includes('.pdf')) {
          urls.add(url)
        }
      }

      return Array.from(urls)
    })

    // Also look for PDFs in page content (text nodes)
    const pageContent = await page.content()
    const pdfPattern = /https?:\/\/[^\s<>"']*\.pdf/gi
    const textPdfs = pageContent.match(pdfPattern) || []

    // Combine and deduplicate
    const allUrls = [...new Set([...pdfUrls, ...textPdfs])]

    if (allUrls.length === 0) {
      return undefined
    }

    // High confidence for JavaScript-detected PDFs (they're dynamically loaded)
    const confidence = Math.min(0.98, 0.85 + allUrls.length * 0.02)

    return {
      strategy: 'javascript',
      pdfUrls: allUrls,
      confidence,
    }
  } catch (error) {
    // Log error but don't throw - let other strategies try
    if (process.env.DEBUG) {
      console.warn('JavaScript detection error:', error instanceof Error ? error.message : error)
    }
    return undefined
  } finally {
    // Always clean up browser resources
    if (page) {
      try {
        await page.close()
      } catch {
        // Ignore close errors
      }
    }
    if (browser) {
      try {
        await browser.close()
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Check if JavaScript rendering is available (Playwright installed)
 */
export async function isJavaScriptStrategyAvailable(): Promise<boolean> {
  try {
    const browser = await chromium.launch({ headless: true })
    await browser.close()
    return true
  } catch {
    return false
  }
}
