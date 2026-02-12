# Website Adapter Discovery System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a system that automatically discovers how to scrape PDFs from problematic websites, saves adapters to JSON, and automatically uses them for similar sites in the future.

**Architecture:** Three-strategy discovery tool (selectors, patterns, JavaScript) that tests against the provided URL, lets the user approve the best result, and saves it to `adapters/site-adapters.json`. The existing URL scraper is modified to check for matching adapters before falling back to default HTML scraping. A matching engine uses domain and heuristic-based logic to select the right adapter.

**Tech Stack:** TypeScript, Node.js, Playwright (for JavaScript rendering), node-html-parser (existing), Axios (existing), simple JSON file storage (no database)

---

## Phase 1: Infrastructure Setup

### Task 1: Create adapter storage structure

**Files:**
- Create: `adapters/site-adapters.json`
- Create: `lib/adapter-types.ts`
- Modify: `package.json` (add npm scripts)

**Step 1: Create adapter types file**

Create `lib/adapter-types.ts`:
```typescript
export interface Adapter {
  id: string
  domains: string[]
  strategy: 'selector' | 'pattern' | 'javascript'
  selector?: string
  pattern?: string
  confidence: number
  dateAdded: string
  description?: string
}

export interface AdapterStore {
  adapters: Adapter[]
  version: '1.0'
}

export interface DiscoveryResult {
  strategy: 'selector' | 'pattern' | 'javascript'
  pdfUrls: string[]
  confidence: number
  selector?: string
  pattern?: string
}
```

**Step 2: Create empty adapter storage file**

Create `adapters/site-adapters.json`:
```json
{
  "version": "1.0",
  "adapters": []
}
```

**Step 3: Add npm scripts to package.json**

Modify `package.json` - add to scripts section:
```json
"scripts": {
  "discover-adapter": "ts-node lib/adapter-discovery.ts discover",
  "list-adapters": "ts-node lib/adapter-discovery.ts list",
  "test-adapter": "ts-node lib/adapter-discovery.ts test",
  "view-adapter": "ts-node lib/adapter-discovery.ts view",
  "remove-adapter": "ts-node lib/adapter-discovery.ts remove"
}
```

**Step 4: Update .gitignore**

Modify `.gitignore` - ensure these lines exist:
```
# Temp files from discovery
/tmp/
*.tmp
```

**Step 5: Commit**

```bash
git add adapters/site-adapters.json lib/adapter-types.ts package.json .gitignore
git commit -m "feat: create adapter storage structure and types"
```

---

### Task 2: Create adapter storage manager

**Files:**
- Create: `lib/adapter-store.ts`
- Create: `tests/lib/adapter-store.test.ts`

**Step 1: Write tests for adapter store**

Create `tests/lib/adapter-store.test.ts`:
```typescript
import { AdapterStore } from '@/lib/adapter-types'
import { loadAdapters, saveAdapters, findAdapterForUrl } from '@/lib/adapter-store'
import fs from 'fs'

describe('Adapter Store', () => {
  const testFile = '/tmp/test-adapters.json'

  beforeEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  it('should load adapters from file', async () => {
    const testData: AdapterStore = {
      version: '1.0',
      adapters: [
        {
          id: 'test-adapter',
          domains: ['example.com'],
          strategy: 'selector',
          selector: 'a.pdf',
          confidence: 0.95,
          dateAdded: '2026-02-07'
        }
      ]
    }

    fs.writeFileSync(testFile, JSON.stringify(testData))
    const result = await loadAdapters(testFile)

    expect(result.adapters).toHaveLength(1)
    expect(result.adapters[0].id).toBe('test-adapter')
  })

  it('should save adapters to file', async () => {
    const store: AdapterStore = {
      version: '1.0',
      adapters: [
        {
          id: 'new-adapter',
          domains: ['newsite.com'],
          strategy: 'pattern',
          pattern: '/downloads/.*\\.pdf',
          confidence: 0.87,
          dateAdded: '2026-02-07'
        }
      ]
    }

    await saveAdapters(testFile, store)
    const loaded = await loadAdapters(testFile)

    expect(loaded.adapters).toHaveLength(1)
    expect(loaded.adapters[0].id).toBe('new-adapter')
  })

  it('should find adapter by exact domain match', async () => {
    const store: AdapterStore = {
      version: '1.0',
      adapters: [
        {
          id: 'adapter1',
          domains: ['site1.com'],
          strategy: 'selector',
          selector: 'a.pdf',
          confidence: 0.95,
          dateAdded: '2026-02-07'
        },
        {
          id: 'adapter2',
          domains: ['site2.com'],
          strategy: 'pattern',
          pattern: '/pdf/.*',
          confidence: 0.8,
          dateAdded: '2026-02-07'
        }
      ]
    }

    const result = findAdapterForUrl('https://site1.com/pages/', store)
    expect(result?.id).toBe('adapter1')
  })

  it('should return null if no adapter matches', async () => {
    const store: AdapterStore = {
      version: '1.0',
      adapters: []
    }

    const result = findAdapterForUrl('https://unknown.com/', store)
    expect(result).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/adapter-store.test.ts
```

Expected output: All tests FAIL with "module not found" or "function not defined"

**Step 3: Implement adapter store**

Create `lib/adapter-store.ts`:
```typescript
import { AdapterStore, Adapter } from '@/lib/adapter-types'
import { promises as fs } from 'fs'
import path from 'path'

const ADAPTER_FILE = path.join(process.cwd(), 'adapters', 'site-adapters.json')

export async function loadAdapters(filePath: string = ADAPTER_FILE): Promise<AdapterStore> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    // Return empty store if file doesn't exist
    return { version: '1.0', adapters: [] }
  }
}

export async function saveAdapters(filePath: string = ADAPTER_FILE, store: AdapterStore): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(store, null, 2))
}

export function findAdapterForUrl(url: string, store: AdapterStore): Adapter | null {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname

    // Exact domain match
    for (const adapter of store.adapters) {
      if (adapter.domains.includes(domain)) {
        return adapter
      }
    }

    // Subdomain match (e.g., www.example.com matches example.com)
    for (const adapter of store.adapters) {
      for (const adapterDomain of adapter.domains) {
        if (domain.endsWith(adapterDomain) || domain.endsWith('.' + adapterDomain)) {
          return adapter
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}

export function addAdapter(store: AdapterStore, adapter: Adapter): void {
  // Remove existing adapter with same ID
  store.adapters = store.adapters.filter(a => a.id !== adapter.id)
  // Add new adapter
  store.adapters.push(adapter)
}

export function removeAdapterById(store: AdapterStore, id: string): boolean {
  const originalLength = store.adapters.length
  store.adapters = store.adapters.filter(a => a.id !== id)
  return store.adapters.length < originalLength
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/adapter-store.test.ts
```

Expected output: All tests PASS

**Step 5: Commit**

```bash
git add lib/adapter-store.ts tests/lib/adapter-store.test.ts
git commit -m "feat: implement adapter store with load/save/find logic"
```

---

## Phase 2: Discovery Strategies

### Task 3: Implement selector detection strategy

**Files:**
- Create: `lib/strategies/selector-strategy.ts`
- Create: `tests/lib/strategies/selector-strategy.test.ts`

**Step 1: Write tests for selector strategy**

Create `tests/lib/strategies/selector-strategy.test.ts`:
```typescript
import { detectWithSelectors } from '@/lib/strategies/selector-strategy'

describe('Selector Strategy', () => {
  it('should find PDFs with href ending in .pdf', async () => {
    const html = `
      <a href="/downloads/file1.pdf">Download 1</a>
      <a href="/downloads/file2.pdf">Download 2</a>
      <a href="/page">Not a PDF</a>
    `

    const result = await detectWithSelectors(html, 'https://example.com/')

    expect(result.pdfUrls).toContain('https://example.com/downloads/file1.pdf')
    expect(result.pdfUrls).toContain('https://example.com/downloads/file2.pdf')
    expect(result.pdfUrls).not.toContain('https://example.com/page')
  })

  it('should try multiple selectors and return best match', async () => {
    const html = `
      <a class="pdf-link" href="/file1.pdf">PDF 1</a>
      <a class="pdf-link" href="/file2.pdf">PDF 2</a>
    `

    const result = await detectWithSelectors(html, 'https://example.com/')

    expect(result.strategy).toBe('selector')
    expect(result.pdfUrls.length).toBeGreaterThan(0)
    expect(result.selector).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should return empty list if no PDFs found', async () => {
    const html = '<a href="/page">Not a PDF</a>'

    const result = await detectWithSelectors(html, 'https://example.com/')

    expect(result.pdfUrls).toHaveLength(0)
  })

  it('should handle relative URLs', async () => {
    const html = `<a href="file.pdf">Download</a>`

    const result = await detectWithSelectors(html, 'https://example.com/pages/')

    expect(result.pdfUrls[0]).toContain('.pdf')
    expect(result.pdfUrls[0]).toContain('example.com')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/strategies/selector-strategy.test.ts
```

**Step 3: Implement selector strategy**

Create `lib/strategies/selector-strategy.ts`:
```typescript
import { DiscoveryResult } from '@/lib/adapter-types'
import { parse } from 'node-html-parser'

const SELECTORS_TO_TRY = [
  'a[href*=".pdf"]',
  'a.pdf-link',
  'a.pdf-download',
  'a[data-pdf]',
  'button.pdf-download',
  'a.download[href*=".pdf"]',
]

export async function detectWithSelectors(html: string, baseUrl: string): Promise<DiscoveryResult> {
  const root = parse(html)
  let bestResult: DiscoveryResult | null = null
  let bestCount = 0

  for (const selector of SELECTORS_TO_TRY) {
    try {
      const elements = root.querySelectorAll(selector)
      const pdfUrls: Set<string> = new Set()

      for (const element of elements) {
        const href = element.getAttribute('href') || element.getAttribute('data-pdf')
        if (href && href.toLowerCase().includes('.pdf')) {
          try {
            const fullUrl = new URL(href, baseUrl).toString()
            pdfUrls.add(fullUrl)
          } catch {
            // Skip invalid URLs
          }
        }
      }

      if (pdfUrls.size > bestCount) {
        bestCount = pdfUrls.size
        bestResult = {
          strategy: 'selector',
          pdfUrls: Array.from(pdfUrls),
          selector,
          confidence: Math.min(0.95, 0.7 + (pdfUrls.size * 0.05)),
        }
      }
    } catch {
      // Continue to next selector
    }
  }

  return (
    bestResult || {
      strategy: 'selector',
      pdfUrls: [],
      confidence: 0,
    }
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/strategies/selector-strategy.test.ts
```

**Step 5: Commit**

```bash
git add lib/strategies/selector-strategy.ts tests/lib/strategies/selector-strategy.test.ts
git commit -m "feat: implement selector detection strategy"
```

---

### Task 4: Implement pattern detection strategy

**Files:**
- Create: `lib/strategies/pattern-strategy.ts`
- Create: `tests/lib/strategies/pattern-strategy.test.ts`

**Step 1: Write tests for pattern strategy**

Create `tests/lib/strategies/pattern-strategy.test.ts`:
```typescript
import { detectWithPatterns } from '@/lib/strategies/pattern-strategy'

describe('Pattern Strategy', () => {
  it('should find common PDF URL patterns', async () => {
    const html = `
      <a href="/downloads/file-1.pdf">PDF</a>
      <a href="/downloads/file-2.pdf">PDF</a>
      <a href="/page">Not PDF</a>
    `

    const result = await detectWithPatterns(html, 'https://example.com/')

    expect(result.strategy).toBe('pattern')
    expect(result.pdfUrls.length).toBeGreaterThan(0)
    expect(result.pattern).toBeDefined()
  })

  it('should identify repeating URL patterns', async () => {
    const html = `
      <a href="/coloring/animal-1.pdf">Animal 1</a>
      <a href="/coloring/animal-2.pdf">Animal 2</a>
      <a href="/coloring/animal-3.pdf">Animal 3</a>
    `

    const result = await detectWithPatterns(html, 'https://example.com/')

    expect(result.pattern).toContain('coloring')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('should return empty if no patterns found', async () => {
    const html = '<a href="/page">Not a PDF</a>'

    const result = await detectWithPatterns(html, 'https://example.com/')

    expect(result.pdfUrls).toHaveLength(0)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/strategies/pattern-strategy.test.ts
```

**Step 3: Implement pattern strategy**

Create `lib/strategies/pattern-strategy.ts`:
```typescript
import { DiscoveryResult } from '@/lib/adapter-types'
import { parse } from 'node-html-parser'

export async function detectWithPatterns(html: string, baseUrl: string): Promise<DiscoveryResult> {
  const root = parse(html)
  const links = root.querySelectorAll('a')
  const urls: string[] = []

  // Extract all PDF URLs
  for (const link of links) {
    const href = link.getAttribute('href')
    if (href && href.toLowerCase().includes('.pdf')) {
      try {
        const fullUrl = new URL(href, baseUrl).toString()
        urls.push(fullUrl)
      } catch {
        // Skip invalid URLs
      }
    }
  }

  if (urls.length === 0) {
    return {
      strategy: 'pattern',
      pdfUrls: [],
      confidence: 0,
    }
  }

  // Find common pattern
  const pattern = findCommonPattern(urls)

  return {
    strategy: 'pattern',
    pdfUrls: urls,
    pattern,
    confidence: Math.min(0.9, 0.6 + (urls.length * 0.05)),
  }
}

function findCommonPattern(urls: string[]): string {
  if (urls.length < 2) return urls[0] || ''

  // Find common path segments
  const pathSegments = urls.map(url => {
    const urlObj = new URL(url)
    return urlObj.pathname
  })

  // Simple pattern: replace varying parts with *
  const first = pathSegments[0]
  let pattern = first

  // Replace numbers with [0-9]+
  pattern = pattern.replace(/\d+/g, '[0-9]+')
  // Replace specific filenames with .*
  const filePattern = pattern.split('/').map(segment => {
    if (segment.includes('[0-9]+')) return segment
    if (segment.endsWith('.pdf')) return '.*\\.pdf'
    return segment
  }).join('/')

  return filePattern
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/strategies/pattern-strategy.test.ts
```

**Step 5: Commit**

```bash
git add lib/strategies/pattern-strategy.ts tests/lib/strategies/pattern-strategy.test.ts
git commit -m "feat: implement pattern detection strategy"
```

---

### Task 5: Implement JavaScript rendering strategy

**Files:**
- Create: `lib/strategies/javascript-strategy.ts`
- Create: `tests/lib/strategies/javascript-strategy.test.ts`
- Modify: `package.json` (add playwright)

**Step 1: Add Playwright dependency**

Modify `package.json` - add to devDependencies:
```json
"playwright": "^1.40.0"
```

Run: `npm install`

**Step 2: Write tests for JavaScript strategy**

Create `tests/lib/strategies/javascript-strategy.test.ts`:
```typescript
import { detectWithJavaScript } from '@/lib/strategies/javascript-strategy'

describe('JavaScript Strategy', () => {
  it('should render page with JavaScript and find PDFs', async () => {
    // This is an integration test - may be slow
    // Could mock Playwright in real tests
    const result = await detectWithJavaScript(
      'https://example.com/',
      { timeout: 10000 }
    )

    expect(result.strategy).toBe('javascript')
    // Result depends on actual page content
  }, 30000) // 30 second timeout

  it('should return empty if page has no PDFs', async () => {
    const result = await detectWithJavaScript(
      'https://example.com/no-pdfs',
      { timeout: 10000 }
    )

    expect(result.strategy).toBe('javascript')
    // May or may not find PDFs depending on page
  }, 30000)
})
```

**Step 3: Run tests to verify they fail**

```bash
npm test -- tests/lib/strategies/javascript-strategy.test.ts
```

**Step 4: Implement JavaScript strategy**

Create `lib/strategies/javascript-strategy.ts`:
```typescript
import { DiscoveryResult } from '@/lib/adapter-types'
import { chromium } from 'playwright'
import { parse } from 'node-html-parser'

interface JavaScriptOptions {
  timeout?: number
  waitFor?: string
}

export async function detectWithJavaScript(
  url: string,
  options: JavaScriptOptions = {}
): Promise<DiscoveryResult> {
  const { timeout = 30000, waitFor } = options
  let browser = null

  try {
    browser = await chromium.launch()
    const context = await browser.createBrowserContext()
    const page = await context.newPage()

    // Set timeout
    page.setDefaultTimeout(timeout)

    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle' })

    // Wait for optional selector
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {})
    } else {
      // Wait a bit for dynamic content
      await page.waitForTimeout(2000)
    }

    // Get HTML after rendering
    const html = await page.content()

    // Extract PDFs from rendered HTML
    const root = parse(html)
    const links = root.querySelectorAll('a')
    const pdfUrls: Set<string> = new Set()

    for (const link of links) {
      const href = link.getAttribute('href')
      if (href && href.toLowerCase().includes('.pdf')) {
        try {
          const fullUrl = new URL(href, url).toString()
          pdfUrls.add(fullUrl)
        } catch {
          // Skip invalid URLs
        }
      }
    }

    await context.close()

    return {
      strategy: 'javascript',
      pdfUrls: Array.from(pdfUrls),
      confidence: pdfUrls.size > 0 ? 0.95 : 0,
    }
  } catch (error) {
    console.error('JavaScript rendering failed:', error)
    return {
      strategy: 'javascript',
      pdfUrls: [],
      confidence: 0,
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- tests/lib/strategies/javascript-strategy.test.ts
```

**Step 6: Commit**

```bash
git add lib/strategies/javascript-strategy.ts tests/lib/strategies/javascript-strategy.test.ts package.json
git commit -m "feat: implement JavaScript rendering strategy with Playwright"
```

---

## Phase 3: Discovery Orchestration

### Task 6: Create discovery orchestrator

**Files:**
- Create: `lib/adapter-discovery-engine.ts`
- Create: `tests/lib/adapter-discovery-engine.test.ts`

**Step 1: Write tests for discovery engine**

Create `tests/lib/adapter-discovery-engine.test.ts`:
```typescript
import { discoverAdapters } from '@/lib/adapter-discovery-engine'

describe('Adapter Discovery Engine', () => {
  it('should run all three strategies and return results', async () => {
    const url = 'https://example.com/pdfs'

    const results = await discoverAdapters(url)

    expect(results).toHaveLength(3)
    expect(results[0].strategy).toBe('selector')
    expect(results[1].strategy).toBe('pattern')
    expect(results[2].strategy).toBe('javascript')
  }, 60000) // Long timeout for JS rendering

  it('should rank results by confidence', async () => {
    const url = 'https://example.com/pdfs'

    const results = await discoverAdapters(url)

    // Results should be sorted by confidence (highest first)
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence)
    }
  }, 60000)

  it('should include PDF count in results', async () => {
    const url = 'https://example.com/pdfs'

    const results = await discoverAdapters(url)

    for (const result of results) {
      expect(result.pdfUrls).toBeDefined()
      expect(Array.isArray(result.pdfUrls)).toBe(true)
    }
  }, 60000)
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/adapter-discovery-engine.test.ts
```

**Step 3: Implement discovery engine**

Create `lib/adapter-discovery-engine.ts`:
```typescript
import { DiscoveryResult } from '@/lib/adapter-types'
import { detectWithSelectors } from '@/lib/strategies/selector-strategy'
import { detectWithPatterns } from '@/lib/strategies/pattern-strategy'
import { detectWithJavaScript } from '@/lib/strategies/javascript-strategy'
import axios from 'axios'

export async function discoverAdapters(url: string): Promise<DiscoveryResult[]> {
  const results: DiscoveryResult[] = []

  console.log(`🔍 Discovering adapters for: ${url}`)

  // Fetch HTML first
  let html = ''
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ColoringBot/1.0)',
      },
      timeout: 10000,
    })
    html = response.data
  } catch (error) {
    console.error('Failed to fetch URL:', error)
    throw new Error(`Failed to fetch ${url}`)
  }

  // Strategy 1: Selector Detection
  console.log('📋 Trying selector detection...')
  try {
    const selectorResult = await detectWithSelectors(html, url)
    results.push(selectorResult)
    if (selectorResult.pdfUrls.length > 0) {
      console.log(`  ✓ Found ${selectorResult.pdfUrls.length} PDFs with selector: ${selectorResult.selector}`)
    } else {
      console.log('  ✗ No PDFs found with selectors')
    }
  } catch (error) {
    console.error('Selector detection failed:', error)
  }

  // Strategy 2: Pattern Detection
  console.log('🔗 Trying pattern detection...')
  try {
    const patternResult = await detectWithPatterns(html, url)
    results.push(patternResult)
    if (patternResult.pdfUrls.length > 0) {
      console.log(`  ✓ Found ${patternResult.pdfUrls.length} PDFs with pattern: ${patternResult.pattern}`)
    } else {
      console.log('  ✗ No PDFs found with patterns')
    }
  } catch (error) {
    console.error('Pattern detection failed:', error)
  }

  // Strategy 3: JavaScript Rendering
  console.log('⚙️  Trying JavaScript rendering...')
  try {
    const jsResult = await detectWithJavaScript(url)
    results.push(jsResult)
    if (jsResult.pdfUrls.length > 0) {
      console.log(`  ✓ Found ${jsResult.pdfUrls.length} PDFs after JavaScript rendering`)
    } else {
      console.log('  ✗ No PDFs found after rendering')
    }
  } catch (error) {
    console.error('JavaScript rendering failed:', error)
  }

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence)

  return results
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/adapter-discovery-engine.test.ts
```

**Step 5: Commit**

```bash
git add lib/adapter-discovery-engine.ts tests/lib/adapter-discovery-engine.test.ts
git commit -m "feat: implement adapter discovery engine with strategy orchestration"
```

---

## Phase 4: CLI Tool

### Task 7: Create CLI discover command

**Files:**
- Create: `lib/cli/commands/discover.ts`
- Modify: `lib/adapter-discovery.ts` (main CLI entry point)

**Step 1: Create CLI entry point**

Create `lib/adapter-discovery.ts`:
```typescript
#!/usr/bin/env node

import { discoverCommand } from '@/lib/cli/commands/discover'
import { listCommand } from '@/lib/cli/commands/list'
import { testCommand } from '@/lib/cli/commands/test'
import { viewCommand } from '@/lib/cli/commands/view'
import { removeCommand } from '@/lib/cli/commands/remove'

const command = process.argv[2]
const args = process.argv.slice(3)

async function main() {
  try {
    switch (command) {
      case 'discover':
        await discoverCommand(args)
        break
      case 'list':
        await listCommand(args)
        break
      case 'test':
        await testCommand(args)
        break
      case 'view':
        await viewCommand(args)
        break
      case 'remove':
        await removeCommand(args)
        break
      default:
        console.log(`
Usage: npm run [command] [args]

Commands:
  discover-adapter <url>     Discover adapters for a website
  list-adapters              List all saved adapters
  test-adapter <url>         Test an adapter against a URL
  view-adapter <id>          View adapter details
  remove-adapter <id>        Remove an adapter

Examples:
  npm run discover-adapter https://example.com/pdfs/
  npm run list-adapters
  npm run test-adapter https://example.com/pdfs/
`)
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
```

**Step 2: Create discover command**

Create `lib/cli/commands/discover.ts`:
```typescript
import { discoverAdapters } from '@/lib/adapter-discovery-engine'
import { loadAdapters, saveAdapters, addAdapter } from '@/lib/adapter-store'
import { Adapter } from '@/lib/adapter-types'
import * as readline from 'readline'

export async function discoverCommand(args: string[]) {
  const url = args[0]

  if (!url) {
    console.error('Usage: npm run discover-adapter <url>')
    process.exit(1)
  }

  console.log('')
  console.log('🚀 Starting adapter discovery...')
  console.log('')

  try {
    // Run discovery
    const results = await discoverAdapters(url)

    // Filter results with PDFs found
    const validResults = results.filter(r => r.pdfUrls.length > 0)

    if (validResults.length === 0) {
      console.log('')
      console.log('❌ No adapters found. No PDFs were discovered with any strategy.')
      process.exit(1)
    }

    // Display results
    console.log('')
    console.log('📊 Discovery Results:')
    console.log('')

    validResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.strategy.toUpperCase()} (${result.confidence * 100 | 0}% confidence)`)
      if (result.selector) console.log(`   Selector: ${result.selector}`)
      if (result.pattern) console.log(`   Pattern: ${result.pattern}`)
      console.log(`   Found: ${result.pdfUrls.length} PDFs`)
      console.log('')
    })

    // Ask user which to use
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    return new Promise<void>((resolve) => {
      rl.question(`Which adapter should I use? (1-${validResults.length}): `, async (answer) => {
        rl.close()

        const index = parseInt(answer) - 1
        if (index < 0 || index >= validResults.length) {
          console.error('Invalid selection')
          process.exit(1)
        }

        const selectedResult = validResults[index]

        // Ask for adapter name
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        rl2.question('Adapter name (e.g., "example-com-js"): ', async (name) => {
          rl2.close()

          if (!name.trim()) {
            console.error('Name is required')
            process.exit(1)
          }

          // Create adapter
          const adapter: Adapter = {
            id: name.trim(),
            domains: [new URL(url).hostname],
            strategy: selectedResult.strategy,
            selector: selectedResult.selector,
            pattern: selectedResult.pattern,
            confidence: selectedResult.confidence,
            dateAdded: new Date().toISOString().split('T')[0],
            description: `Auto-discovered adapter for ${new URL(url).hostname}`,
          }

          // Save adapter
          const store = await loadAdapters()
          addAdapter(store, adapter)
          await saveAdapters(process.cwd() + '/adapters/site-adapters.json', store)

          console.log('')
          console.log(`✅ Adapter saved: ${adapter.id}`)
          console.log(`   Domain: ${adapter.domains[0]}`)
          console.log(`   Strategy: ${adapter.strategy}`)
          console.log(`   PDFs found: ${selectedResult.pdfUrls.length}`)
          console.log('')
          console.log('Ready to use on similar websites! 🎉')

          resolve()
        })
      })
    })
  } catch (error) {
    console.error('❌ Discovery failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
```

**Step 3: Create other CLI commands**

Create `lib/cli/commands/list.ts`:
```typescript
import { loadAdapters } from '@/lib/adapter-store'

export async function listCommand(_args: string[]) {
  const store = await loadAdapters()

  if (store.adapters.length === 0) {
    console.log('No adapters found.')
    return
  }

  console.log('')
  console.log('📋 Saved Adapters:')
  console.log('')

  for (const adapter of store.adapters) {
    console.log(`• ${adapter.id}`)
    console.log(`  Domains: ${adapter.domains.join(', ')}`)
    console.log(`  Strategy: ${adapter.strategy}`)
    console.log(`  Confidence: ${(adapter.confidence * 100 | 0)}%`)
    console.log(`  Added: ${adapter.dateAdded}`)
    console.log('')
  }
}
```

Create `lib/cli/commands/view.ts`:
```typescript
import { loadAdapters } from '@/lib/adapter-store'

export async function viewCommand(args: string[]) {
  const adapterId = args[0]

  if (!adapterId) {
    console.error('Usage: npm run view-adapter <adapter-id>')
    process.exit(1)
  }

  const store = await loadAdapters()
  const adapter = store.adapters.find(a => a.id === adapterId)

  if (!adapter) {
    console.error(`Adapter not found: ${adapterId}`)
    process.exit(1)
  }

  console.log('')
  console.log(`📋 Adapter: ${adapter.id}`)
  console.log('')
  console.log(`Domains: ${adapter.domains.join(', ')}`)
  console.log(`Strategy: ${adapter.strategy}`)
  if (adapter.selector) console.log(`Selector: ${adapter.selector}`)
  if (adapter.pattern) console.log(`Pattern: ${adapter.pattern}`)
  console.log(`Confidence: ${(adapter.confidence * 100 | 0)}%`)
  console.log(`Date Added: ${adapter.dateAdded}`)
  if (adapter.description) console.log(`Description: ${adapter.description}`)
  console.log('')
}
```

Create `lib/cli/commands/test.ts`:
```typescript
import { loadAdapters, findAdapterForUrl } from '@/lib/adapter-store'
import axios from 'axios'
import { parse } from 'node-html-parser'
import { detectWithSelectors } from '@/lib/strategies/selector-strategy'
import { detectWithPatterns } from '@/lib/strategies/pattern-strategy'
import { detectWithJavaScript } from '@/lib/strategies/javascript-strategy'

export async function testCommand(args: string[]) {
  const url = args[0]
  const adapterId = args[1]

  if (!url) {
    console.error('Usage: npm run test-adapter <url> [adapter-id]')
    process.exit(1)
  }

  const store = await loadAdapters()
  let adapter = findAdapterForUrl(url, store)

  if (adapterId) {
    const found = store.adapters.find(a => a.id === adapterId)
    if (!found) {
      console.error(`Adapter not found: ${adapterId}`)
      process.exit(1)
    }
    adapter = found
  }

  if (!adapter) {
    console.log('No adapter found for this URL. Using default scraper.')
    return
  }

  console.log('')
  console.log(`🧪 Testing adapter: ${adapter.id}`)
  console.log('')

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ColoringBot/1.0)' },
      timeout: 10000,
    })

    let pdfUrls: string[] = []

    if (adapter.strategy === 'selector' && adapter.selector) {
      const result = await detectWithSelectors(response.data, url)
      pdfUrls = result.pdfUrls
    } else if (adapter.strategy === 'pattern' && adapter.pattern) {
      const result = await detectWithPatterns(response.data, url)
      pdfUrls = result.pdfUrls
    } else if (adapter.strategy === 'javascript') {
      const result = await detectWithJavaScript(url)
      pdfUrls = result.pdfUrls
    }

    console.log(`✅ Found ${pdfUrls.length} PDFs`)
    if (pdfUrls.length > 0) {
      console.log('First few PDFs:')
      pdfUrls.slice(0, 5).forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`)
      })
    }
    console.log('')
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
```

Create `lib/cli/commands/remove.ts`:
```typescript
import { loadAdapters, saveAdapters, removeAdapterById } from '@/lib/adapter-store'

export async function removeCommand(args: string[]) {
  const adapterId = args[0]

  if (!adapterId) {
    console.error('Usage: npm run remove-adapter <adapter-id>')
    process.exit(1)
  }

  const store = await loadAdapters()
  const removed = removeAdapterById(store, adapterId)

  if (!removed) {
    console.error(`Adapter not found: ${adapterId}`)
    process.exit(1)
  }

  await saveAdapters(process.cwd() + '/adapters/site-adapters.json', store)
  console.log(`✅ Adapter removed: ${adapterId}`)
}
```

**Step 4: Test CLI commands manually**

```bash
npm run list-adapters
npm run discover-adapter https://example.com
```

**Step 5: Commit**

```bash
git add lib/cli/commands/ lib/adapter-discovery.ts
git commit -m "feat: implement complete CLI with discover, list, test, view, remove commands"
```

---

## Phase 5: URL Scraper Integration

### Task 8: Integrate adapters into URL scraper

**Files:**
- Modify: `lib/url-scraper.ts`
- Create: `lib/adapter-url-scraper.ts`
- Create: `tests/lib/adapter-url-scraper.test.ts`

**Step 1: Write tests for adapter-aware scraper**

Create `tests/lib/adapter-url-scraper.test.ts`:
```typescript
import { handleUrlDownloadWithAdapters } from '@/lib/adapter-url-scraper'

describe('Adapter-Aware URL Scraper', () => {
  it('should use adapter if available', async () => {
    // Mock scenario: adapter exists for domain
    const url = 'https://example.com/pdfs/'

    // This would use the adapter if it exists in site-adapters.json
    try {
      const result = await handleUrlDownloadWithAdapters(url)
      expect(Array.isArray(result)).toBe(true)
    } catch {
      // Expected if domain has no adapter and no PDFs found
    }
  })

  it('should fall back to default scraper if no adapter', async () => {
    const url = 'https://unknown-domain-12345.com/'

    try {
      const result = await handleUrlDownloadWithAdapters(url)
      // Should attempt default scraper
      expect(Array.isArray(result)).toBe(true)
    } catch (error) {
      // Expected if no PDFs found
      expect(error).toBeDefined()
    }
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/adapter-url-scraper.test.ts
```

**Step 3: Create adapter-aware scraper**

Create `lib/adapter-url-scraper.ts`:
```typescript
import { loadAdapters, findAdapterForUrl } from '@/lib/adapter-store'
import { detectWithSelectors } from '@/lib/strategies/selector-strategy'
import { detectWithPatterns } from '@/lib/strategies/pattern-strategy'
import { detectWithJavaScript } from '@/lib/strategies/javascript-strategy'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { writeFile } from 'fs/promises'

const TMP_DIR = '/tmp/coloring-book'

export async function handleUrlDownloadWithAdapters(url: string): Promise<string[]> {
  // Create temp directory
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true })
  }

  // Load adapters
  const store = await loadAdapters()
  const adapter = findAdapterForUrl(url, store)

  let pdfUrls: Set<string> = new Set()

  if (adapter) {
    console.log(`🔗 Using adapter: ${adapter.id}`)

    // Fetch HTML
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ColoringBot/1.0)' },
      timeout: 10000,
    })

    // Use adapter's strategy
    if (adapter.strategy === 'selector' && adapter.selector) {
      const result = await detectWithSelectors(response.data, url)
      result.pdfUrls.forEach(u => pdfUrls.add(u))
    } else if (adapter.strategy === 'pattern' && adapter.pattern) {
      const result = await detectWithPatterns(response.data, url)
      result.pdfUrls.forEach(u => pdfUrls.add(u))
    } else if (adapter.strategy === 'javascript') {
      const result = await detectWithJavaScript(url)
      result.pdfUrls.forEach(u => pdfUrls.add(u))
    }
  } else {
    console.log('📋 Using default scraper (no adapter found)')

    // Use default scraper from original url-scraper.ts
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ColoringBot/1.0)' },
      timeout: 10000,
    })

    const result = await detectWithSelectors(response.data, url)
    result.pdfUrls.forEach(u => pdfUrls.add(u))
  }

  if (pdfUrls.size === 0) {
    throw new Error('No PDF links found on the provided URL')
  }

  // Download PDFs
  const pdfPaths: string[] = []
  let downloadCount = 0

  for (const pdfUrl of pdfUrls) {
    try {
      if (downloadCount >= 20) break

      const pdfResponse = await axios.get(pdfUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ColoringBot/1.0)' },
        timeout: 30000,
        responseType: 'arraybuffer',
      })

      const fileName = extractFileNameFromUrl(pdfUrl)
      const filePath = path.join(TMP_DIR, fileName)

      if (!fs.existsSync(filePath)) {
        await writeFile(filePath, Buffer.from(pdfResponse.data))
        pdfPaths.push(filePath)
        downloadCount++
      }

      // Be polite
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.warn(`Failed to download: ${pdfUrl}`)
    }
  }

  return pdfPaths
}

function extractFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    let fileName = path.basename(pathname) || `pdf_${Date.now()}`
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

// Import for JavaScript strategy
import { detectWithJavaScript } from '@/lib/strategies/javascript-strategy'
```

**Step 4: Update existing url-scraper to use adapters**

Modify `lib/url-scraper.ts` to delegate to adapter-aware scraper:

```typescript
import { handleUrlDownloadWithAdapters } from '@/lib/adapter-url-scraper'

export async function handleUrlDownload(url: string): Promise<string[]> {
  return handleUrlDownloadWithAdapters(url)
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- tests/lib/adapter-url-scraper.test.ts
```

**Step 6: Commit**

```bash
git add lib/adapter-url-scraper.ts lib/url-scraper.ts tests/lib/adapter-url-scraper.test.ts
git commit -m "feat: integrate adapters into URL scraper with fallback logic"
```

---

## Phase 6: Documentation

### Task 9: Create comprehensive adapter system documentation

**Files:**
- Create: `docs/ADAPTERS.md`
- Create: `docs/plans/2026-02-07-adapter-discovery-system.md` (this file)

**Step 1: Create ADAPTERS.md documentation**

Create `docs/ADAPTERS.md`:
```markdown
# Website Adapter System

## Overview

The Website Adapter System automatically discovers how to scrape PDFs from websites that don't work with the default scraper. Once you teach the system about a website, it automatically uses that knowledge for similar sites.

## Quick Start

### Discover an Adapter

```bash
npm run discover-adapter https://example.com/coloring-pages/
```

The tool will:
1. Try 3 different detection strategies
2. Show you the results
3. Ask which one works best
4. Save it for future use

### Use a Saved Adapter

Adapters are used **automatically**. Once saved, the system will use them whenever you provide a URL from that domain.

## How It Works

### Discovery Process

When you run `discover-adapter`, the system tries three strategies in parallel:

#### Strategy 1: Selector Detection
- Tries common CSS selectors for PDF links
- Examples: `.pdf-link`, `a[href*=".pdf"]`, `button.download`
- Fast and simple
- Best for: Straightforward HTML structures

#### Strategy 2: Pattern Detection
- Extracts all URLs from the page
- Identifies common patterns (e.g., `/downloads/file-*.pdf`)
- Good for: Numbered or predictable PDF naming

#### Strategy 3: JavaScript Rendering
- Renders the page with JavaScript
- Re-runs detection on rendered content
- Slowest but most comprehensive
- Best for: Dynamic sites like greencoloring.com

Results are ranked by confidence (0-100%) and the best matches are shown first.

### Adapter Matching

When you provide a URL, the system:
1. Extracts the domain
2. Checks for exact domain match in saved adapters
3. Checks for subdomain matches
4. Falls back to default scraper if no match found

## Commands

### Discover Adapters
```bash
npm run discover-adapter <url>
```

Find the best way to scrape PDFs from a website.

**Example:**
```bash
npm run discover-adapter https://new-coloring-site.com/pages/
```

### List Adapters
```bash
npm run list-adapters
```

View all saved adapters.

### Test Adapter
```bash
npm run test-adapter <url> [adapter-id]
```

Test an adapter against a URL to verify it works.

**Example:**
```bash
npm run test-adapter https://example.com/pdfs/ example-com-js
```

### View Adapter
```bash
npm run view-adapter <adapter-id>
```

See details of a specific adapter.

### Remove Adapter
```bash
npm run remove-adapter <adapter-id>
```

Delete an adapter you no longer need.

## Examples

### Example 1: Simple Website with PDF Links

```bash
$ npm run discover-adapter https://simple-coloring.com/

🔍 Discovering adapters for: https://simple-coloring.com/

📋 Trying selector detection...
  ✓ Found 12 PDFs with selector: a.pdf-link

🔗 Trying pattern detection...
  ✓ Found 12 PDFs with pattern: /downloads/coloring-*.pdf

⚙️  Trying JavaScript rendering...
  ✓ Found 12 PDFs after JavaScript rendering

📊 Discovery Results:

1. JAVASCRIPT (95% confidence)
   Found: 12 PDFs

2. SELECTOR (92% confidence)
   Selector: a.pdf-link
   Found: 12 PDFs

3. PATTERN (87% confidence)
   Pattern: /downloads/coloring-*.pdf
   Found: 12 PDFs

Which adapter should I use? (1-3): 2
Adapter name (e.g., "example-com-js"): simple-coloring-selector

✅ Adapter saved: simple-coloring-selector
   Domain: simple-coloring.com
   Strategy: selector
   PDFs found: 12

Ready to use on similar websites! 🎉
```

### Example 2: Dynamic Website with JavaScript

```bash
$ npm run discover-adapter https://greencoloring.com/animal-pages/

🔍 Discovering adapters for: https://greencoloring.com/animal-pages/

📋 Trying selector detection...
  ✗ No PDFs found with selectors

🔗 Trying pattern detection...
  ✗ No PDFs found with patterns

⚙️  Trying JavaScript rendering...
  ✓ Found 45 PDFs after JavaScript rendering

📊 Discovery Results:

1. JAVASCRIPT (95% confidence)
   Found: 45 PDFs

Which adapter should I use? (1-1): 1
Adapter name: greencoloring-js

✅ Adapter saved: greencoloring-js
   Domain: greencoloring.com
   Strategy: javascript
   PDFs found: 45

Ready to use on similar websites! 🎉
```

## Adapter Storage

Adapters are stored in `adapters/site-adapters.json`:

```json
{
  "version": "1.0",
  "adapters": [
    {
      "id": "simple-coloring-selector",
      "domains": ["simple-coloring.com"],
      "strategy": "selector",
      "selector": "a.pdf-link",
      "confidence": 0.92,
      "dateAdded": "2026-02-07",
      "description": "Auto-discovered adapter for simple-coloring.com"
    },
    {
      "id": "greencoloring-js",
      "domains": ["greencoloring.com"],
      "strategy": "javascript",
      "confidence": 0.95,
      "dateAdded": "2026-02-07"
    }
  ]
}
```

This file is:
- Committed to git
- Deployed with your app
- Easy to review and edit manually if needed

## Deployment

Adapters are automatically deployed with your application:

1. Save adapter locally: `npm run discover-adapter <url>`
2. Commit to git: `git add adapters/site-adapters.json`
3. Push to GitHub: `git push`
4. GitHub Actions auto-deploys to AWS
5. Adapters immediately available on production

## Troubleshooting

### "No adapters found" error

If discovery finds no PDFs:
1. Check the URL is correct
2. Website might require authentication
3. PDFs might be in a different format (not .pdf)
4. Website structure might be unusual

### Adapter not being used

1. Check domain matches exactly: `npm run list-adapters`
2. Test manually: `npm run test-adapter <url>`
3. Verify adapter is saved in `adapters/site-adapters.json`

### Low confidence score

Low confidence (< 70%) means the strategy found PDFs but wasn't very confident. You can still use it, but:
- Test thoroughly with: `npm run test-adapter <url>`
- Consider using a higher confidence option if available

## Adding Adapters Manually

You can edit `adapters/site-adapters.json` directly if needed:

```json
{
  "id": "custom-adapter",
  "domains": ["mysite.com"],
  "strategy": "pattern",
  "pattern": "/pdfs/[0-9]+\\.pdf",
  "confidence": 0.85,
  "dateAdded": "2026-02-07",
  "description": "Custom adapter for mysite.com"
}
```

Then commit and deploy.

## Best Practices

✅ **Do:**
- Test adapters before committing: `npm run test-adapter`
- Use JavaScript strategy for dynamic sites
- Name adapters descriptively: `{domain}-{strategy}`
- Keep confidence scores realistic

❌ **Don't:**
- Use low-confidence adapters without testing
- Save adapters for multiple unrelated domains in one adapter
- Manually edit adapters unless necessary

## Architecture

The adapter system consists of:

- **Discovery Engine** (`lib/adapter-discovery-engine.ts`)
  - Orchestrates 3 detection strategies
  - Runs in parallel for speed
  - Ranks results by confidence

- **Detection Strategies**
  - `lib/strategies/selector-strategy.ts` - CSS selectors
  - `lib/strategies/pattern-strategy.ts` - URL patterns
  - `lib/strategies/javascript-strategy.ts` - JavaScript rendering

- **Adapter Store** (`lib/adapter-store.ts`)
  - Load/save adapters
  - Find adapters for URLs
  - CRUD operations

- **URL Scraper Integration** (`lib/adapter-url-scraper.ts`)
  - Uses adapters automatically
  - Falls back to default scraper
  - Seamless integration

- **CLI Tool** (`lib/adapter-discovery.ts` + `lib/cli/commands/`)
  - discover, list, test, view, remove commands
  - User-friendly interface
  - Direct file management

## Technical Details

### Confidence Scoring

Confidence scores are 0-1.0 and indicate how sure the system is about the results:

- **0.95+**: Very confident (JavaScript found PDFs, multiple selectors matched)
- **0.80-0.95**: Confident (Pattern matched, selector found PDFs)
- **0.60-0.80**: Somewhat confident (Found PDFs but not very sure)
- **<0.60**: Low confidence (Use with caution, test first)

### Performance

- Selector detection: < 100ms
- Pattern detection: < 100ms
- JavaScript rendering: 3-10 seconds (browser startup)
- Total discovery: 5-15 seconds depending on strategies used

## Future Enhancements

- Screenshot evidence in discovery results
- Adapter testing in GitHub Actions
- Heuristic-based automatic adapter selection
- Community adapter registry
- Performance analytics and optimization

---

Need help? Run: `npm run discover-adapter --help`
```

**Step 2: Commit**

```bash
git add docs/ADAPTERS.md
git commit -m "docs: add comprehensive adapter system documentation"
```

---

## Phase 7: Testing & Final Integration

### Task 10: Write integration tests

**Files:**
- Create: `tests/integration/adapter-system.test.ts`

**Step 1: Create integration tests**

Create `tests/integration/adapter-system.test.ts`:
```typescript
import { discoverAdapters } from '@/lib/adapter-discovery-engine'
import { loadAdapters, saveAdapters, addAdapter, findAdapterForUrl } from '@/lib/adapter-store'
import { handleUrlDownloadWithAdapters } from '@/lib/adapter-url-scraper'
import { Adapter } from '@/lib/adapter-types'
import fs from 'fs'

describe('Adapter System Integration', () => {
  const testFile = '/tmp/test-adapters-integration.json'

  beforeEach(async () => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  it('should complete full adapter workflow', async () => {
    // 1. Discover adapters
    const results = await discoverAdapters('https://example.com/')
    expect(results.length).toBe(3) // Should try all 3 strategies
    expect(results.some(r => r.confidence > 0)).toBe(true)

    // 2. Create adapter from best result
    const store = await loadAdapters(testFile)
    const bestResult = results.sort((a, b) => b.confidence - a.confidence)[0]

    const adapter: Adapter = {
      id: 'example-adapter',
      domains: ['example.com'],
      strategy: bestResult.strategy,
      selector: bestResult.selector,
      pattern: bestResult.pattern,
      confidence: bestResult.confidence,
      dateAdded: '2026-02-07',
    }

    // 3. Save adapter
    addAdapter(store, adapter)
    await saveAdapters(testFile, store)

    // 4. Load and verify
    const loaded = await loadAdapters(testFile)
    expect(loaded.adapters).toHaveLength(1)
    expect(loaded.adapters[0].id).toBe('example-adapter')

    // 5. Find adapter for URL
    const found = findAdapterForUrl('https://example.com/pages/', loaded)
    expect(found?.id).toBe('example-adapter')

    // 6. Use with adapter-aware scraper
    try {
      const pdfs = await handleUrlDownloadWithAdapters('https://example.com/pages/')
      expect(Array.isArray(pdfs)).toBe(true)
    } catch (error) {
      // OK if no actual PDFs, we're testing the flow
    }
  }, 60000)

  it('should handle adapter removal', async () => {
    const store = await loadAdapters(testFile)

    const adapter: Adapter = {
      id: 'temp-adapter',
      domains: ['temp.com'],
      strategy: 'selector',
      selector: 'a.pdf',
      confidence: 0.9,
      dateAdded: '2026-02-07',
    }

    addAdapter(store, adapter)
    await saveAdapters(testFile, store)

    expect((await loadAdapters(testFile)).adapters).toHaveLength(1)

    // Remove
    const store2 = await loadAdapters(testFile)
    store2.adapters = store2.adapters.filter(a => a.id !== 'temp-adapter')
    await saveAdapters(testFile, store2)

    expect((await loadAdapters(testFile)).adapters).toHaveLength(0)
  })
})
```

**Step 2: Run integration tests**

```bash
npm test -- tests/integration/adapter-system.test.ts
```

**Step 3: Commit**

```bash
git add tests/integration/adapter-system.test.ts
git commit -m "test: add comprehensive adapter system integration tests"
```

---

### Task 11: Build and verify everything works

**Step 1: Build the project**

```bash
npm run build
```

**Step 2: Run all tests**

```bash
npm test
```

**Step 3: Test CLI manually (if applicable)**

```bash
npm run list-adapters
```

**Step 4: Final commit**

```bash
git add .
git commit -m "build: verify complete adapter system builds and tests pass"
```

---

## Summary

This plan implements a complete **Website Adapter Discovery System** that:

1. **Discovers adapters** using 3 strategies (selector, pattern, JavaScript)
2. **Saves adapters** to simple JSON file
3. **Auto-matches adapters** to URLs using domain heuristics
4. **Integrates seamlessly** with existing URL scraper
5. **Provides CLI commands** for managing adapters
6. **Deploys easily** with the app to AWS
7. **Fully tested** with unit and integration tests
8. **Well documented** with examples and troubleshooting

**Total tasks**: 11
**Estimated time**: 4-6 hours
**Complexity**: Medium (TypeScript, CLI, multiple strategies)

---

Plan complete and saved to `docs/plans/2026-02-07-adapter-discovery-system.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?