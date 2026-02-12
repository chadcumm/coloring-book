import { parse } from 'node-html-parser'
import type { DiscoveryResult } from '../adapter-types'

// Common CSS selectors to try when detecting PDF links
export const COMMON_SELECTORS = [
  'a[href*=".pdf"]', // Links with .pdf in href
  '[data-pdf-url]', // Elements with data-pdf-url attribute
  'a[href$=".pdf"]', // Links ending with .pdf
  'a.pdf-download', // Links with pdf-download class
  'a.pdf', // Links with pdf class
  'a[data-filetype="pdf"]', // Links with pdf filetype data
  '[href*="download"][href*=".pdf"]', // Download links with pdf
  'a[title*="PDF"]', // Links with PDF in title
]

interface SelectionMatch {
  selector: string
  urls: string[]
  count: number
}

/**
 * Try to detect PDF URLs using CSS selectors
 * Tests common selectors against the HTML and returns results
 */
export function detectWithSelectors(html: string): DiscoveryResult | undefined {
  try {
    const root = parse(html)
    const matches: SelectionMatch[] = []

    // Try each selector
    for (const selector of COMMON_SELECTORS) {
      const elements = root.querySelectorAll(selector)
      if (elements.length === 0) continue

      const urls: string[] = []

      for (const element of elements) {
        let url: string | undefined

        // Try to get URL from href attribute
        if (element.hasAttribute('href')) {
          url = element.getAttribute('href')
        }
        // Try to get URL from data-pdf-url attribute
        else if (element.hasAttribute('data-pdf-url')) {
          url = element.getAttribute('data-pdf-url')
        }
        // Try other data attributes that might contain URLs
        else {
          const attributes = element.attributes
          for (const [key, value] of Object.entries(attributes)) {
            if ((key.includes('url') || key.includes('pdf')) && typeof value === 'string') {
              url = value
              break
            }
          }
        }

        if (url && url.includes('.pdf')) {
          urls.push(url)
        }
      }

      // Remove duplicates
      const uniqueUrls = [...new Set(urls)]

      if (uniqueUrls.length > 0) {
        matches.push({
          selector,
          urls: uniqueUrls,
          count: uniqueUrls.length,
        })
      }
    }

    // If no matches found, return undefined
    if (matches.length === 0) {
      return undefined
    }

    // Sort by number of matches (more matches = more confidence)
    matches.sort((a, b) => b.count - a.count)
    const bestMatch = matches[0]

    // Calculate confidence based on:
    // - How many PDFs found (more = higher confidence)
    // - How specific the selector is
    const confidence = Math.min(0.99, 0.65 + bestMatch.count * 0.1)

    return {
      strategy: 'selector',
      pdfUrls: bestMatch.urls,
      selector: bestMatch.selector,
      confidence,
    }
  } catch (error) {
    // If parsing fails, return undefined
    return undefined
  }
}
