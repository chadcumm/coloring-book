# Adapter System API Reference

## For Developers

### Core Types

```typescript
// An individual adapter configuration
interface Adapter {
  id: string                          // Unique identifier
  domains: string[]                   // List of domains this adapter handles
  strategy: 'selector' | 'pattern' | 'javascript'  // Detection strategy
  selector?: string                   // CSS selector (selector strategy)
  pattern?: string                    // Regex pattern (pattern strategy)
  confidence: number                  // Confidence score (0-1)
  dateAdded: string                   // ISO 8601 timestamp
  description?: string                // Optional description
}

// Storage structure for all adapters
interface AdapterStore {
  adapters: Adapter[]
  version: '1.0'
}

// Result from a detection strategy
interface DiscoveryResult {
  strategy: 'selector' | 'pattern' | 'javascript'
  pdfUrls: string[]                   // Found PDF URLs
  confidence: number                  // Confidence score
  selector?: string                   // CSS selector (if selector strategy)
  pattern?: string                    // Regex pattern (if pattern strategy)
}
```

### Adapter Store API

**File:** `lib/adapter-store.ts`

#### loadAdapters(storePath?)

Load adapters from storage file. Creates empty store if file missing.

```typescript
const store = await loadAdapters()
// Returns: AdapterStore { version: '1.0', adapters: [...] }
```

#### saveAdapters(store, storePath?)

Save adapters to JSON file.

```typescript
await saveAdapters(store)
```

#### findAdapterForDomain(domain, storePath?)

Find the best adapter for a domain.

```typescript
const adapter = await findAdapterForDomain('greencoloring.com')
// Returns: Adapter | undefined
```

Domain matching:
- Exact match: `greencoloring.com` matches domain `greencoloring.com`
- Base domain: `sub.greencoloring.com` matches domain `greencoloring.com`

#### addAdapter(adapter, storePath?)

Add or update an adapter.

```typescript
await addAdapter({
  id: 'adapter-1',
  domains: ['example.com'],
  strategy: 'selector',
  selector: 'a[href*=".pdf"]',
  confidence: 0.9,
  dateAdded: new Date().toISOString(),
})
```

#### removeAdapter(adapterId, storePath?)

Remove adapter by ID.

```typescript
const found = await removeAdapter('adapter-1')
// Returns: boolean (true if removed, false if not found)
```

#### getAllAdapters(storePath?)

Get all stored adapters.

```typescript
const all = await getAllAdapters()
// Returns: Adapter[]
```

#### clearAllAdapters(storePath?)

Clear all adapters (use with caution).

```typescript
await clearAllAdapters()
```

### Discovery Engine API

**File:** `lib/adapter-discovery-engine.ts`

#### discoverAdapter(html, url?)

Discover adapter for a website. Runs all three strategies and returns best result.

```typescript
const adapter = await discoverAdapter(htmlContent, 'https://example.com')
// Returns: Adapter | undefined
```

#### discoverAdapterWithReport(html, url?)

Discovery with detailed report of all strategy results.

```typescript
const report = await discoverAdapterWithReport(htmlContent, 'https://example.com')
// Returns: { results: DiscoveryResult[], bestResult?: DiscoveryResult, timestamp: string }
```

### Detection Strategies

#### detectWithSelectors(html)

CSS selector-based detection (synchronous).

```typescript
import { detectWithSelectors } from 'lib/strategies/selector-strategy'

const result = detectWithSelectors(htmlContent)
// Returns: DiscoveryResult | undefined
```

#### detectWithPatterns(html)

Pattern/regex-based detection (synchronous).

```typescript
import { detectWithPatterns } from 'lib/strategies/pattern-strategy'

const result = detectWithPatterns(htmlContent)
// Returns: DiscoveryResult | undefined
```

#### detectWithJavaScript(url, options?)

JavaScript rendering detection (asynchronous).

```typescript
import { detectWithJavaScript } from 'lib/strategies/javascript-strategy'

const result = await detectWithJavaScript('https://example.com', {
  timeout: 30000,      // Total timeout in ms
  waitTime: 3000,      // Wait for JS to render
  headless: true       // Run headless browser
})
// Returns: Promise<DiscoveryResult | undefined>
```

### URL Scraper Integration

#### getPdfUrlsWithAdapters(url)

Get PDFs from a URL using adapters if available.

```typescript
import { getPdfUrlsWithAdapters } from 'lib/url-scraper'

const result = await getPdfUrlsWithAdapters('https://example.com')
// Returns: { pdfUrls: string[], adapter?: Adapter, source: 'adapter' | 'default' }
```

## Usage Examples

### Example 1: Discovering and Saving an Adapter

```typescript
import { discoverAdapter } from 'lib/adapter-discovery-engine'
import { addAdapter } from 'lib/adapter-store'
import axios from 'axios'

async function discoverAndSaveAdapter(url: string) {
  // Fetch page content
  const response = await axios.get(url)
  const html = response.data

  // Discover adapter
  const adapter = await discoverAdapter(html, url)

  if (adapter) {
    // Save for future use
    await addAdapter(adapter)
    console.log(`Adapter saved: ${adapter.id}`)
  } else {
    console.log('No adapter could be discovered')
  }
}
```

### Example 2: Using Adapters in URL Scraper

```typescript
import { getPdfUrlsWithAdapters } from 'lib/url-scraper'

async function scrapeWithAdapters(url: string) {
  const result = await getPdfUrlsWithAdapters(url)

  console.log(`Found ${result.pdfUrls.length} PDFs`)

  if (result.adapter) {
    console.log(`Using adapter: ${result.adapter.id}`)
    console.log(`Strategy: ${result.adapter.strategy}`)
  } else {
    console.log('Using default scraping')
  }

  return result.pdfUrls
}
```

### Example 3: Testing an Adapter

```typescript
import { findAdapterForDomain } from 'lib/adapter-store'
import { parse } from 'node-html-parser'
import axios from 'axios'

async function testAdapter(domain: string, testUrl: string) {
  const adapter = await findAdapterForDomain(domain)

  if (!adapter) {
    console.log('No adapter found')
    return
  }

  // Fetch test page
  const response = await axios.get(testUrl)
  const html = response.data
  const root = parse(html)

  // Apply adapter
  if (adapter.strategy === 'selector' && adapter.selector) {
    const elements = root.querySelectorAll(adapter.selector)
    console.log(`Found ${elements.length} matches`)
  }
}
```

## Environment Variables

**DEBUG** - Enable debug logging

```bash
DEBUG=true npm run discover-adapter
```

Shows:
- Strategy execution details
- PDF URL discovery process
- Confidence calculations
- Fallback decisions

## Error Handling

All adapter functions return `undefined` or `null` on errors rather than throwing. This allows graceful degradation and fallback to default scraping.

```typescript
try {
  const adapter = await findAdapterForDomain(domain)
  if (!adapter) {
    console.log('No adapter, using default scraping')
  }
} catch (error) {
  // Should rarely happen - adapter functions handle errors internally
  console.error('Unexpected error:', error)
}
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Load adapters | <10ms | From disk (JSON file) |
| Save adapters | <20ms | Write to disk |
| Find adapter | <5ms | Domain lookup |
| Selector detection | <200ms | Parse HTML + test selectors |
| Pattern detection | <500ms | Regex matching on full HTML |
| JavaScript detection | 3-5s | Browser load + render wait |
| Discover (all 3) | 3-6s | Parallel execution |

## Backward Compatibility

- Version field in AdapterStore: `"1.0"`
- Future versions will maintain read compatibility with v1.0 adapters
- Never use non-v1.0 adapters

---

For more information, see:
- [User Guide](./ADAPTERS.md)
- [Discovery Process Details](./ADAPTER_DISCOVERY_PROCESS.md)
