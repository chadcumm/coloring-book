# Website Adapter Discovery System

## Quick Start

The Coloring Book Grid Service automatically scrapes PDF images from websites. However, some websites have complex structures that don't work with default scraping. The Adapter Discovery System learns how to scrape these difficult sites.

### For Users: Discovering Adapters

If you encounter a website that doesn't work:

```bash
npm run discover-adapter
```

Follow the prompts:
1. Enter the website URL
2. The system tests CSS selectors, URL patterns, and JavaScript rendering
3. Choose which detection method works best
4. Save the adapter

The next time you use that website, the system automatically uses the adapter.

### Available Commands

```bash
# Discover adapter for a new website
npm run discover-adapter

# List all discovered adapters
npm run list-adapters

# View details of a specific adapter
npm run view-adapter

# Test an adapter against a URL
npm run test-adapter

# Remove an adapter you no longer need
npm run remove-adapter
```

## How It Works

### Automatic Detection (Behind the Scenes)

When you provide a website URL for discovery, the system tries three different detection strategies in parallel:

1. **CSS Selector Detection** (Fast)
   - Looks for common CSS selectors that link to PDFs
   - Tests patterns like `a[href*=".pdf"]`, `.pdf-download`, etc.
   - Good for websites with consistent HTML structure
   - Execution time: <200ms

2. **Pattern Detection** (Medium)
   - Analyzes the HTML text for recurring PDF URL patterns
   - Detects patterns like `/downloads/page1.pdf`, `/files/image_001.pdf`
   - Good for websites with structured naming conventions
   - Execution time: <500ms

3. **JavaScript Rendering** (Thorough)
   - Loads the website in a headless browser
   - Waits for JavaScript to finish rendering
   - Captures PDF links that are dynamically inserted by JavaScript
   - Good for modern React/Vue/Angular sites
   - Execution time: ~3-5 seconds

### Result Selection

The system picks the **best result** based on:
1. Confidence score (how sure is the detection)
2. Number of PDFs found
3. Strategy reliability (JavaScript > Pattern > Selector)

### Storage Format

Adapters are stored in JSON format in `adapters/site-adapters.json`:

```json
{
  "version": "1.0",
  "adapters": [
    {
      "id": "adapter-1673890234567",
      "domains": ["greencoloring.com"],
      "strategy": "selector",
      "selector": "a[href*='.pdf']",
      "confidence": 0.92,
      "dateAdded": "2026-02-07T18:30:00Z",
      "description": "Auto-discovered from greencoloring.com"
    }
  ]
}
```

### Domain Matching

When you visit a website, the system:
1. Extracts the domain name
2. Checks if an adapter exists for that domain
3. Uses the adapter's selector/pattern to find PDFs
4. Falls back to default scraping if no adapter exists

## Adapter Strategies

### Selector Strategy

**Best for:** Websites with consistent HTML structure

**Example:**
```
Website: example.com
Selector: a[href*=".pdf"]
Found: 15 PDF links
Confidence: 92%
```

**How it works:**
- Uses CSS selectors to find PDF links
- Fast because it doesn't need to render JavaScript
- Works even if PDFs are loaded dynamically (if in HTML)

### Pattern Strategy

**Best for:** Websites with URL naming patterns

**Example:**
```
Website: coloringpages.com
Pattern: /pdf/page\d+\.pdf
Found: 8 PDF links
Confidence: 85%
```

**How it works:**
- Analyzes the page text for recurring patterns
- Detects predictable naming like `/pdf/page1.pdf`, `/pdf/page2.pdf`
- Good for sites with structured PDF naming

### JavaScript Strategy

**Best for:** Modern interactive websites with dynamic content

**Example:**
```
Website: interactive-coloring.com
Strategy: JavaScript rendering
Found: 23 PDF links (loaded dynamically)
Confidence: 94%
```

**How it works:**
- Loads the website in a real browser (Playwright/Chromium)
- Waits for JavaScript to finish running
- Captures PDFs that are dynamically inserted into the page
- Most reliable but slowest

## Best Practices

### When to Create Adapters

Create an adapter when:
- A website doesn't work with default scraping
- The website has a consistent structure
- You plan to use the website multiple times

### Adapter Quality

A good adapter should:
- Have confidence score of 80% or higher
- Find 3+ PDFs (indicates reliable detection)
- Use a simple, specific selector or pattern
- Work for multiple pages on the website

### Testing Adapters

Before relying on an adapter:

```bash
npm run test-adapter
```

Select your adapter and provide a test URL. The system will:
1. Load the page
2. Apply the adapter's selector/pattern
3. Show how many PDFs were found
4. Display the first few PDF URLs

### Troubleshooting

**Issue: Adapter found no PDFs**
- The website structure may have changed
- Try discovering a fresh adapter
- Check if the website is loading JavaScript (`npm run view-adapter` and check strategy)

**Issue: Wrong PDFs detected**
- The selector/pattern might be too broad
- Try discovering again on a different page of the website
- Use the test command to verify

**Issue: JavaScript strategy taking too long**
- Some websites are slow to render
- Consider using Selector or Pattern strategy if available
- Try removing and re-discovering the adapter

## Integration with URL Scraper

The adapter system integrates seamlessly with the main URL scraper:

```typescript
// The scraper automatically uses adapters
const result = await getPdfUrlsWithAdapters('https://example.com')

// Returns: { pdfUrls: [...], adapter: {...}, source: 'adapter' | 'default' }
```

When you upload PDFs from a website:
1. System checks for matching adapter
2. If found, uses adapter's selector/pattern (fast)
3. If not found, uses default HTML scraping
4. Results combined and grid layout applied

## Advanced: Creating Adapters Manually

For advanced users, you can edit `adapters/site-adapters.json` directly:

```json
{
  "id": "custom-adapter-1",
  "domains": ["mysite.com"],
  "strategy": "selector",
  "selector": "#pdf-list a",
  "confidence": 0.88,
  "dateAdded": "2026-02-07T18:30:00Z",
  "description": "Custom adapter for mysite.com"
}
```

**Required fields:**
- `id`: Unique identifier
- `domains`: Array of domain names
- `strategy`: One of: "selector", "pattern", "javascript"
- `confidence`: Number from 0-1 (0.5-0.99)
- `dateAdded`: ISO 8601 timestamp

**Strategy-specific fields:**
- `selector`: CSS selector (for selector strategy)
- `pattern`: Regex pattern string (for pattern strategy)

## FAQ

**Q: Will adapters work across different websites?**
A: No, adapters are domain-specific. Each website needs its own adapter based on its structure.

**Q: What happens if an adapter fails?**
A: The system falls back to default HTML scraping automatically.

**Q: Can I share adapters with others?**
A: You can copy the adapter JSON, but it may not work on other instances if website structures differ.

**Q: How often should I update adapters?**
A: If websites change structure, discover fresh adapters. Old adapters are kept for backward compatibility.

**Q: Why is JavaScript discovery slow?**
A: It launches a real browser (Chromium) to render JavaScript, which takes 3-5 seconds per page.

**Q: Can adapters break my scraping?**
A: No, they enhance it. If an adapter fails, the system falls back to default scraping.

## See Also

- [Adapter API Reference](./ADAPTER_API.md) - For developers
- [Discovery Process Details](./ADAPTER_DISCOVERY_PROCESS.md) - How detection works internally
