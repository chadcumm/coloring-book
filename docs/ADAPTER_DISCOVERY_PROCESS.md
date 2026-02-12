# Adapter Discovery Process - Technical Deep Dive

## Overview

When you run `npm run discover-adapter`, the system goes through a multi-stage process to understand how to scrape PDFs from a website.

## High-Level Flow

```
User Input (URL)
    ↓
Fetch Page Content
    ↓
Run 3 Detection Strategies in Parallel:
    ├→ CSS Selector Detection (Fast, <200ms)
    ├→ Pattern Detection (Medium, <500ms)
    └→ JavaScript Detection (Slow, 3-5s)
    ↓
Collect All Results
    ↓
Filter by Confidence (Min 50%)
    ↓
Select Best Result (Sort by: confidence, PDF count, strategy priority)
    ↓
Convert to Adapter
    ↓
Prompt User for Confirmation
    ↓
Save Adapter
```

## Stage 1: Fetch Page Content

```typescript
// Get the HTML from the website
const response = await axios.get(url, {
  timeout: 30000,
  headers: { 'User-Agent': '...' }
})
const html = response.data
```

**What happens:**
- HTTP GET request to the URL
- Standard User-Agent header (identify as browser)
- 30-second timeout

**Common issues:**
- Website blocks requests (403, 429)
- Website requires authentication
- Website times out

## Stage 2: CSS Selector Detection

**Strategy:** Try common CSS selectors that typically point to PDF links

```typescript
const COMMON_SELECTORS = [
  'a[href*=".pdf"]',         // Links containing .pdf
  '[data-pdf-url]',          // Elements with data-pdf-url
  'a[href$=".pdf"]',         // Links ending with .pdf
  'a.pdf-download',          // Links with pdf-download class
  'a.pdf',                   // Links with pdf class
  // ... 3 more selectors
]
```

**Algorithm:**
1. Parse HTML using `node-html-parser`
2. For each selector, try to match elements
3. Extract `href` or `data-pdf-url` attributes
4. Check if URL contains `.pdf`
5. Deduplicate URLs
6. Calculate confidence: `0.65 + (count * 0.05)` (min 0.65, max 0.95)

**Example:**
```
HTML: <a href="/downloads/page1.pdf">Download</a>
      <a href="/downloads/page2.pdf">Download</a>

Selector tested: 'a[href*=".pdf"]'
Matches: 2 elements
URLs found: ['/downloads/page1.pdf', '/downloads/page2.pdf']
Confidence: 0.75 (0.65 + 0.05*2)
Result: ✅ Found 2 PDFs with 75% confidence
```

**Strengths:**
- Very fast (<200ms)
- Works for most websites
- Doesn't need JavaScript rendering

**Weaknesses:**
- Doesn't work if PDFs are added by JavaScript
- Misses PDFs in non-standard selectors

## Stage 3: Pattern Detection

**Strategy:** Analyze the full page text for recurring URL patterns

```typescript
const PATTERNS = [
  /data:application\/pdf;base64,[...]/g,  // Data URLs
  /\/[...]*pdf[...]*\/[...]*\.pdf/gi,     // Path/pdf/ pattern
  /\/[...]*\/[...]*\.pdf(?:\?[...])?/gi,  // General path pattern
  /https?:\/\/[...]*\.pdf/gi,             // Full URLs
  // ... more patterns
]
```

**Algorithm:**
1. Extract all text from HTML (remove tags)
2. Apply each regex pattern
3. Collect all matches
4. Deduplicate
5. Analyze pattern structure
6. Calculate confidence based on pattern consistency

**Example:**
```
HTML text contains:
  /pdf/page1.pdf
  /pdf/page2.pdf
  /pdf/page3.pdf
  /other/not-pdf.txt

Patterns matched: /pdf/page\d+\.pdf
URLs: 3 PDFs found
Pattern consistency: 100% (all match same pattern)
Confidence: 0.85 (high consistency detected)
Result: ✅ Found 3 PDFs with 85% confidence
```

**Strengths:**
- Detects predictable naming schemes
- Works even if selectors are inconsistent
- Fast (<500ms)

**Weaknesses:**
- Misses random URLs
- Doesn't work if PDFs are in JavaScript

## Stage 4: JavaScript Detection

**Strategy:** Load the website in a real browser, wait for JavaScript, then look for PDF links

```typescript
// Use Playwright/Chromium
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)  // Wait for JS
const links = await page.evaluate(() => {
  return document.querySelectorAll('a[href*=".pdf"]')
    .map(el => el.getAttribute('href'))
})
```

**Algorithm:**
1. Launch headless Chromium browser
2. Navigate to URL
3. Wait for network activity to settle
4. Wait 3 more seconds for JavaScript to render
5. Query DOM for PDF links
6. Also scan page content for PDF URLs
7. Convert relative URLs to absolute
8. Deduplicate

**Example:**
```
Website uses React to load PDF list from API

Timeline:
  T=0ms: Page load starts
  T=500ms: React code runs, fetches PDF list
  T=1500ms: API response arrives, PDFs rendered
  T=3000ms: We query the DOM → ✅ PDFs found!

URLs found: 23 PDF links (dynamically loaded)
Confidence: 0.94 (high because JavaScript-detected)
Result: ✅ Found 23 PDFs with 94% confidence
```

**Strengths:**
- Detects dynamically loaded PDFs
- Most reliable method
- Catches PDFs loaded by JavaScript

**Weaknesses:**
- Slow (3-5+ seconds)
- Requires browser installation (Playwright/Chromium)
- Can hang on broken websites

## Stage 5: Select Best Result

**Sorting algorithm:**
1. Filter results with confidence < 0.5 (50%)
2. Sort by confidence (descending)
3. If confidence tied, sort by PDF count (more = better)
4. If tied, sort by strategy priority: JavaScript > Pattern > Selector

**Example:**
```
Results after filtering:
┌─────────────────────────────────────────┐
│ Selector:    3 PDFs, 85% confidence     │
│ Pattern:     4 PDFs, 88% confidence     │
│ JavaScript:  4 PDFs, 91% confidence ✅  │
└─────────────────────────────────────────┘

Winner: JavaScript (highest confidence)
```

**Why this ranking:**
- **Confidence**: Most important (reliability)
- **PDF count**: More PDFs = more reliable detection
- **Strategy priority**: JavaScript is most reliable (real browser)

## Stage 6: Convert to Adapter

```typescript
const adapter: Adapter = {
  id: `adapter-${Date.now()}`,           // Unique ID
  domains: [new URL(url).hostname],      // Extract domain
  strategy: result.strategy,             // 'selector' | 'pattern' | 'javascript'
  selector: result.selector,             // CSS selector (if applicable)
  pattern: result.pattern,               // Regex pattern (if applicable)
  confidence: result.confidence,         // Confidence score
  dateAdded: new Date().toISOString(),   // Timestamp
  description: `Auto-discovered from ${domain}` // Description
}
```

## Stage 7: User Confirmation

Shows user:
- Best result strategy
- Confidence score
- Number of PDFs found
- All strategy results (for comparison)

Asks: "Save this adapter?"

## Stage 8: Save Adapter

```typescript
await addAdapter(adapter)
```

Saves to `adapters/site-adapters.json`:
```json
{
  "version": "1.0",
  "adapters": [
    { ...adapter }
  ]
}
```

## Error Handling

If any stage fails:

1. **Fetch fails** → Show error, suggest checking URL
2. **All strategies fail** → "No PDFs found" message
3. **Low confidence results** → Filter out, try other strategies
4. **JS detection hangs** → Timeout after 30s, continue with other results

## Performance Optimization

### Parallel Execution
- Selector and Pattern strategies run synchronously (fast)
- JavaScript strategy runs asynchronously in parallel
- No waiting for slow strategies

Timeline:
```
T=0s:   Start selector detection ──→ ✅ Done @200ms
T=0s:   Start pattern detection ──→ ✅ Done @500ms
T=0s:   Start JS detection (async) ──→ (runs in background)

T=500ms: All fast strategies done, show results
T=5s:    JS detection completes
→ If JS is better, update results
```

### Caching
- Adapters cached in memory during discovery
- HTTP requests not cached (get fresh page)

## Debugging

Enable debug output:
```bash
DEBUG=true npm run discover-adapter
```

Shows:
```
🔍 Testing detection strategies...

📍 Running selector detection...
  Found selector: a[href*=".pdf"]
  Matched 3 elements
  Confidence: 0.80

📍 Running pattern detection...
  Found pattern: /pdf/page\d+\.pdf
  Matched 4 elements
  Confidence: 0.88

📍 Running JavaScript detection...
  Launching browser...
  Loading https://example.com...
  Waiting for JS render...
  Found 5 PDF elements
  Confidence: 0.92

🏆 Best result: JavaScript (92% confidence, 5 PDFs)
```

## Common Issues and Solutions

### Issue: "No PDFs found"
- Website structure might be unusual
- PDFs might not be linked directly
- Solution: Try different website URL or check if PDFs exist on that page

### Issue: Low confidence (<70%)
- Detection method uncertain about results
- Solution: Manually verify by viewing found PDFs
- May need to find better sample page

### Issue: JavaScript detection times out
- Website is slow or requires authentication
- Solution: Use pattern or selector result instead

### Issue: Pattern detection finds wrong URLs
- Pattern too broad, matching non-PDF URLs
- Solution: Accept selector or JavaScript result instead

---

For more information:
- [User Guide](./ADAPTERS.md)
- [API Reference](./ADAPTER_API.md)
