import { detectWithSelectors } from './strategies/selector-strategy'
import { detectWithPatterns } from './strategies/pattern-strategy'
import { detectWithJavaScript } from './strategies/javascript-strategy'
import type { Adapter, DiscoveryResult } from './adapter-types'

interface DiscoveryReport {
  results: DiscoveryResult[]
  bestResult?: DiscoveryResult
  timestamp: string
}

const MINIMUM_CONFIDENCE = 0.5

/**
 * Run all detection strategies in parallel and return the best result
 * Strategy priority (when confidence is equal):
 * 1. JavaScript (most reliable - actual browser)
 * 2. Pattern (good - looks at page structure)
 * 3. Selector (fast - CSS-based)
 */
export async function discoverAdapter(html: string, url?: string): Promise<Adapter | undefined> {
  const timestamp = new Date().toISOString()
  const report: DiscoveryReport = {
    results: [],
    timestamp,
  }

  // Run synchronous strategies immediately
  const selectorResult = detectWithSelectors(html)
  const patternResult = detectWithPatterns(html)

  // Add to results
  if (selectorResult) {
    report.results.push(selectorResult)
  }
  if (patternResult) {
    report.results.push(patternResult)
  }

  // Run JavaScript strategy in parallel (it's async)
  const jsResultPromise = url ? detectWithJavaScript(url) : Promise.resolve(undefined)

  try {
    const jsResult = await jsResultPromise
    if (jsResult) {
      report.results.push(jsResult)
    }
  } catch (error) {
    // JS detection failed, continue without it
    if (process.env.DEBUG) {
      console.warn('JS detection error:', error)
    }
  }

  // Filter out low-confidence results
  const validResults = report.results.filter(r => r.confidence >= MINIMUM_CONFIDENCE)

  if (validResults.length === 0) {
    return undefined
  }

  // Sort by confidence (highest first)
  validResults.sort((a, b) => {
    // Primary: confidence score
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence
    }

    // Secondary: number of PDFs found
    if (b.pdfUrls.length !== a.pdfUrls.length) {
      return b.pdfUrls.length - a.pdfUrls.length
    }

    // Tertiary: strategy priority (JS > Pattern > Selector)
    const strategyPriority = { javascript: 3, pattern: 2, selector: 1 }
    return (strategyPriority[b.strategy] || 0) - (strategyPriority[a.strategy] || 0)
  })

  const bestResult = validResults[0]

  // Convert DiscoveryResult to Adapter
  const adapter: Adapter = {
    id: `adapter-${Date.now()}`,
    domains: url ? extractDomainFromUrl(url) : [],
    strategy: bestResult.strategy,
    selector: bestResult.selector,
    pattern: bestResult.pattern,
    confidence: bestResult.confidence,
    dateAdded: timestamp,
    description: `Auto-discovered using ${bestResult.strategy} strategy`,
  }

  // Store report for debugging
  if (process.env.DEBUG) {
    console.log('Discovery Report:', JSON.stringify(report, null, 2))
  }

  return adapter
}

/**
 * Extract domain from URL
 */
function extractDomainFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url)
    return [urlObj.hostname]
  } catch {
    return []
  }
}

/**
 * Run discovery and return a detailed report of all strategy results
 */
export async function discoverAdapterWithReport(
  html: string,
  url?: string
): Promise<DiscoveryReport> {
  const timestamp = new Date().toISOString()
  const report: DiscoveryReport = {
    results: [],
    timestamp,
  }

  // Run strategies
  const selectorResult = detectWithSelectors(html)
  const patternResult = detectWithPatterns(html)

  if (selectorResult) {
    report.results.push(selectorResult)
  }
  if (patternResult) {
    report.results.push(patternResult)
  }

  // JavaScript strategy
  if (url) {
    try {
      const jsResult = await detectWithJavaScript(url)
      if (jsResult) {
        report.results.push(jsResult)
      }
    } catch (error) {
      // Continue without JS detection
    }
  }

  // Select best result
  const validResults = report.results.filter(r => r.confidence >= MINIMUM_CONFIDENCE)
  if (validResults.length > 0) {
    validResults.sort((a, b) => b.confidence - a.confidence)
    report.bestResult = validResults[0]
  }

  return report
}
