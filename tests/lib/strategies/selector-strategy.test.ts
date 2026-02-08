import { describe, it, expect } from 'vitest'
import { detectWithSelectors, COMMON_SELECTORS } from '../../../lib/strategies/selector-strategy'

describe('SelectorStrategy', () => {
  // Sample HTML snippets for testing
  const htmlWithPdfLinks = `
    <html>
      <body>
        <a href="/downloads/coloring-page-1.pdf">Download PDF 1</a>
        <a href="/downloads/coloring-page-2.pdf">Download PDF 2</a>
        <a href="/about">About Us</a>
      </body>
    </html>
  `

  const htmlWithDataAttribute = `
    <html>
      <body>
        <div data-pdf-url="/files/image1.pdf">Image 1</div>
        <div data-pdf-url="/files/image2.pdf">Image 2</div>
        <span data-pdf-url="/files/image3.pdf">Image 3</span>
      </body>
    </html>
  `

  const htmlWithClassSelector = `
    <html>
      <body>
        <a class="pdf-download" href="/pdf/page1.pdf">Page 1</a>
        <a class="pdf-download" href="/pdf/page2.pdf">Page 2</a>
        <button>Regular button</button>
      </body>
    </html>
  `

  const htmlNoPdfs = `
    <html>
      <body>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <img src="/image.jpg" />
      </body>
    </html>
  `

  it('should detect PDF links with href attribute', () => {
    const result = detectWithSelectors(htmlWithPdfLinks)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(2)
    expect(result?.pdfUrls).toContain('/downloads/coloring-page-1.pdf')
    expect(result?.pdfUrls).toContain('/downloads/coloring-page-2.pdf')
    expect(result?.confidence).toBeGreaterThan(0.8)
  })

  it('should detect PDFs from data attributes', () => {
    const result = detectWithSelectors(htmlWithDataAttribute)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(3)
    expect(result?.pdfUrls).toContain('/files/image1.pdf')
    expect(result?.selector).toContain('data-pdf-url')
  })

  it('should detect PDFs from class-based selectors', () => {
    const result = detectWithSelectors(htmlWithClassSelector)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(2)
    expect(result?.pdfUrls).toContain('/pdf/page1.pdf')
  })

  it('should return undefined when no PDFs found', () => {
    const result = detectWithSelectors(htmlNoPdfs)
    expect(result).toBeUndefined()
  })

  it('should have common selectors defined', () => {
    expect(COMMON_SELECTORS).toBeDefined()
    expect(COMMON_SELECTORS.length).toBeGreaterThan(0)
    expect(COMMON_SELECTORS).toContain('a[href*=".pdf"]')
  })

  it('should return strategy name as "selector"', () => {
    const result = detectWithSelectors(htmlWithPdfLinks)
    expect(result?.strategy).toBe('selector')
  })

  it('should handle malformed HTML gracefully', () => {
    const malformed = '<html><body><a href="/test.pdf">Test</a>'
    const result = detectWithSelectors(malformed)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toContain('/test.pdf')
  })

  it('should ignore relative paths without absolute conversion', () => {
    const html = `<html><body><a href="relative.pdf">Download</a></body></html>`
    const result = detectWithSelectors(html)
    // Should find the PDF URL as-is
    expect(result?.pdfUrls).toContain('relative.pdf')
  })

  it('should deduplicate PDF URLs', () => {
    const html = `
      <html>
        <body>
          <a href="/pdf/page.pdf">Page</a>
          <a href="/pdf/page.pdf">Same Page</a>
          <a href="/pdf/page.pdf">Another reference</a>
        </body>
      </html>
    `
    const result = detectWithSelectors(html)
    expect(result?.pdfUrls).toHaveLength(1)
    expect(result?.pdfUrls).toContain('/pdf/page.pdf')
  })

  it('should calculate confidence based on number of matches', () => {
    const htmlMany = `
      <html>
        <body>
          ${Array.from({ length: 20 }, (_, i) => `<a href="/pdf/page${i}.pdf">Page ${i}</a>`).join('')}
        </body>
      </html>
    `
    const result = detectWithSelectors(htmlMany)
    expect(result?.confidence).toBeGreaterThan(0.9)
  })
})
