import axios from 'axios'
import { parse } from 'node-html-parser'
import fs from 'fs'
import path from 'path'
import { writeFile } from 'fs/promises'
import { findAdapterForDomain } from './adapter-store'
import type { Adapter } from './adapter-types'

const TMP_DIR = '/tmp/coloring-book'

export async function handleUrlDownload(url: string): Promise<string[]> {
  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true })
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    })

    // Parse HTML to find PDF links
    const root = parse(response.data)
    const links = root.querySelectorAll('a')

    const pdfUrls: Set<string> = new Set()

    for (const link of links) {
      const href = link.getAttribute('href')
      if (href && href.toLowerCase().endsWith('.pdf')) {
        try {
          // Convert relative URLs to absolute
          const pdfUrl = new URL(href, url).toString()
          pdfUrls.add(pdfUrl)
        } catch {
          // Skip invalid URLs
        }
      }
    }

    if (pdfUrls.size === 0) {
      throw new Error('No PDF links found on the provided URL')
    }

    // Download each PDF
    const pdfPaths: string[] = []
    let downloadCount = 0

    for (const pdfUrl of pdfUrls) {
      try {
        if (downloadCount >= 20) {
          // Limit to 20 PDFs
          break
        }

        const pdfResponse = await axios.get(pdfUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          timeout: 30000,
          responseType: 'arraybuffer',
        })

        const fileName = extractFileNameFromUrl(pdfUrl)
        const filePath = path.join(TMP_DIR, fileName)

        // Check if file already exists (avoid duplicates)
        if (!fs.existsSync(filePath)) {
          await writeFile(filePath, Buffer.from(pdfResponse.data))
          pdfPaths.push(filePath)
          downloadCount++
        }

        // Small delay to be polite to server
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.warn(`Failed to download PDF from ${pdfUrl}:`, error)
        // Continue with next PDF
      }
    }

    if (pdfPaths.length === 0) {
      throw new Error('Failed to download any PDFs from the provided URL')
    }

    return pdfPaths
  } catch (error) {
    throw new Error(
      `Failed to download PDFs from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

function extractFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    let fileName = path.basename(pathname) || `pdf_${Date.now()}`

    // Ensure .pdf extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf'
    }

    return sanitizeFileName(fileName)
  } catch {
    return `pdf_${Date.now()}.pdf`
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .substring(0, 255)
}

/**
 * Fetch HTML content from a URL
 * @param url - The URL to fetch
 * @returns HTML content as string
 */
export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    timeout: 10000,
  })
  return response.data
}

/**
 * Extract PDF URLs from HTML content
 * This is the default scraping strategy
 * @param html - HTML content
 * @returns Array of PDF URLs found in the HTML
 */
export async function getPdfUrlsFromHtml(html: string): Promise<string[]> {
  const root = parse(html)
  const links = root.querySelectorAll('a')

  const pdfUrls: Set<string> = new Set()

  for (const link of links) {
    const href = link.getAttribute('href')
    if (href && href.toLowerCase().endsWith('.pdf')) {
      pdfUrls.add(href)
    }
  }

  return Array.from(pdfUrls)
}

/**
 * Get PDF URLs from a website, using adapters if available
 * Falls back to HTML scraping if no adapter found
 * @param url - The website URL to scrape
 * @returns Object with PDF URLs and adapter info (if used)
 */
export async function getPdfUrlsWithAdapters(
  url: string
): Promise<{ pdfUrls: string[]; adapter?: Adapter; source: 'adapter' | 'default' }> {
  try {
    // Extract domain from URL
    const domain = new URL(url).hostname

    // Check if adapter exists for this domain
    const adapter = await findAdapterForDomain(domain)

    if (adapter) {
      console.log(`📍 Using adapter for ${domain}: ${adapter.id}`)

      // Use adapter to find PDFs
      let pdfUrls: string[] = []

      // Fetch the page
      const html = await fetchHtml(url)

      if (adapter.strategy === 'selector' && adapter.selector) {
        // Use CSS selector strategy
        const root = parse(html)
        const elements = root.querySelectorAll(adapter.selector)

        for (const element of elements) {
          const href = element.getAttribute('href') || element.getAttribute('data-pdf-url')
          if (href && href.toLowerCase().includes('.pdf')) {
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(href, url).href
            pdfUrls.push(absoluteUrl)
          }
        }
      } else if (adapter.strategy === 'pattern' && adapter.pattern) {
        // Use pattern matching strategy
        const pattern = new RegExp(adapter.pattern, 'g')
        const matches = html.match(pattern) || []

        for (const match of matches) {
          if (match.toLowerCase().includes('.pdf')) {
            // Convert relative URLs to absolute
            try {
              const absoluteUrl = new URL(match, url).href
              pdfUrls.push(absoluteUrl)
            } catch {
              // Keep as-is if not a valid URL
              pdfUrls.push(match)
            }
          }
        }
      } else if (adapter.strategy === 'javascript') {
        // JavaScript strategy - use the existing scraper which handles dynamic content
        pdfUrls = await getPdfUrlsFromHtml(html)
      }

      // Deduplicate
      pdfUrls = [...new Set(pdfUrls)]

      if (pdfUrls.length > 0) {
        return {
          pdfUrls,
          adapter,
          source: 'adapter',
        }
      }

      // If adapter didn't find anything, fall back to default
      console.log(`⚠️  Adapter found no PDFs, falling back to default scraping`)
    }

    // No adapter or adapter failed - use default scraping
    console.log(`📝 Using default scraping for ${domain}`)
    const html = await fetchHtml(url)
    const pdfUrls = await getPdfUrlsFromHtml(html)

    return {
      pdfUrls,
      source: 'default',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to get PDFs from ${url}: ${message}`)
    throw error
  }
}
