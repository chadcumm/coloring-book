import type { DiscoveryResult } from '../adapter-types'

interface PatternMatch {
  pattern: RegExp
  urls: Set<string>
  confidence: number
}

/**
 * Extract all potential PDF URLs from HTML
 * Looks for URLs in both href attributes and text content
 */
function extractPotentialUrls(html: string): string[] {
  const urls: string[] = []

  // Extract from href attributes
  const hrefRegex = /href=["']([^"']*\.pdf[^"']*)["']/gi
  let match
  while ((match = hrefRegex.exec(html)) !== null) {
    urls.push(match[1])
  }

  // Extract from text content (remove HTML tags first)
  const textContent = html.replace(/<[^>]*>/g, ' ')

  // Look for URL-like patterns in text
  const urlRegex = /([\/\w\-./]*\.pdf(?:\?[^\s<>"']*)?)/gi
  while ((match = urlRegex.exec(textContent)) !== null) {
    urls.push(match[1])
  }

  // Look for data URLs with base64 encoded content (including incomplete ones with ...)
  const dataUrlRegex = /(data:application\/pdf;base64,[A-Za-z0-9+/=.]+)/g
  while ((match = dataUrlRegex.exec(html)) !== null) {
    urls.push(match[1])
  }

  return urls
}


/**
 * Find patterns in PDF URLs to understand the structure
 */
function findPattern(urls: string[]): string | undefined {
  if (urls.length < 2) return undefined

  // Check for common patterns
  const pathPatterns: { [key: string]: number } = {}

  for (const url of urls) {
    // Extract the base path without numbers/variables
    const simplifiedPath = url.replace(/\d+/g, 'N').replace(/[a-z]+_[a-z]+/g, 'VAR')
    pathPatterns[simplifiedPath] = (pathPatterns[simplifiedPath] || 0) + 1
  }

  // Find the most common simplified path
  let mostCommon = ''
  let maxCount = 0
  for (const [pattern, count] of Object.entries(pathPatterns)) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = pattern
    }
  }

  // Only return pattern if at least 50% of URLs match it
  if (maxCount >= urls.length * 0.5) {
    return mostCommon
  }

  return undefined
}

/**
 * Calculate confidence based on pattern matching
 */
function calculateConfidence(urls: string[], pattern: string | undefined): number {
  // Base confidence from number of URLs
  let confidence = Math.min(0.95, 0.5 + urls.length * 0.05)

  // Boost confidence if we found a pattern
  if (pattern) {
    confidence = Math.min(0.95, confidence + 0.15)
  }

  return confidence
}

/**
 * Clean and validate a URL
 */
function cleanUrl(url: string): string | null {
  // Trim whitespace
  url = url.trim()

  // Handle data URLs specially
  if (url.startsWith('data:application/pdf')) {
    return url
  }

  // Remove trailing punctuation that might have been matched
  url = url.replace(/[,;:)]$/, '')

  // Must contain .pdf for non-data URLs
  if (!url.includes('.pdf')) {
    return null
  }

  // Must start with / for relative URLs, http for absolute, or data: for data URLs
  if (!url.match(/^(\/|https?:\/\/|data:)/)) {
    return null
  }

  return url
}

/**
 * Detect PDF URLs using pattern analysis
 * Looks for recurring patterns in the HTML that suggest PDF URLs
 */
export function detectWithPatterns(html: string): DiscoveryResult | undefined {
  try {
    // Extract all potential PDF URLs from the HTML
    const potentialUrls = extractPotentialUrls(html)
    const foundUrls = new Set<string>()

    // Clean and validate each URL
    for (const url of potentialUrls) {
      const cleanedUrl = cleanUrl(url)
      if (cleanedUrl) {
        foundUrls.add(cleanedUrl)
      }
    }

    // If no URLs found, return undefined
    if (foundUrls.size === 0) {
      return undefined
    }

    const urls = Array.from(foundUrls)
    const pattern = findPattern(urls)
    const confidence = calculateConfidence(urls, pattern)

    return {
      strategy: 'pattern',
      pdfUrls: urls,
      pattern,
      confidence,
    }
  } catch (error) {
    return undefined
  }
}
