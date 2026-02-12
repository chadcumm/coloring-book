import { describe, it, expect } from 'vitest'
import { detectWithPatterns } from '../../../lib/strategies/pattern-strategy'

describe('PatternStrategy', () => {
  it('should detect simple numbered PDF pattern', () => {
    const html = `
      <html>
        <body>
          <a href="/pdf/page1.pdf">Page 1</a>
          <a href="/pdf/page2.pdf">Page 2</a>
          <a href="/pdf/page3.pdf">Page 3</a>
        </body>
      </html>
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toContain('/pdf/page1.pdf')
    expect(result?.pdfUrls).toContain('/pdf/page2.pdf')
    expect(result?.pdfUrls).toContain('/pdf/page3.pdf')
    expect(result?.pattern).toBeDefined()
    expect(result?.confidence).toBeGreaterThan(0.7)
  })

  it('should detect PDFs in download directory pattern', () => {
    const html = `
      <html>
        <body>
          Download: /downloads/file1.pdf or /downloads/file2.pdf or /downloads/file3.pdf
        </body>
      </html>
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(3)
    expect(result?.pattern).toContain('downloads')
  })

  it('should detect wildcard patterns with numbers', () => {
    const html = `
      <a href="/images/coloring_001.pdf">Image 1</a>
      <a href="/images/coloring_002.pdf">Image 2</a>
      <a href="/images/coloring_010.pdf">Image 10</a>
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(3)
    expect(result?.pattern).toBeDefined()
  })

  it('should detect base64 encoded PDFs in data URLs', () => {
    const html = `
      Some content with data:application/pdf;base64,JVBERi0...
    `
    const result = detectWithPatterns(html)
    // Data URLs are valid PDF sources
    expect(result).toBeDefined()
    expect(result?.pdfUrls.some(url => url.startsWith('data:application/pdf'))).toBe(true)
  })

  it('should detect PDFs with query parameters', () => {
    const html = `
      <a href="/file.pdf?id=123">Download 1</a>
      <a href="/file.pdf?id=456">Download 2</a>
      <a href="/file.pdf?id=789">Download 3</a>
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(3)
  })

  it('should detect PDFs in subdirectory structure', () => {
    const html = `
      View: /content/pdfs/book/chapter1.pdf
      Also: /content/pdfs/book/chapter2.pdf
      And: /content/pdfs/book/chapter3.pdf
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(3)
    expect(result?.pdfUrls[0]).toContain('/content/pdfs/book/')
  })

  it('should return undefined when no pattern found', () => {
    const html = `
      <html>
        <body>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </body>
      </html>
    `
    const result = detectWithPatterns(html)
    expect(result).toBeUndefined()
  })

  it('should handle URLs with special characters', () => {
    const html = `
      <a href="/downloads/file-with-dash_1.pdf">File 1</a>
      <a href="/downloads/file-with-dash_2.pdf">File 2</a>
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(2)
  })

  it('should return strategy name as "pattern"', () => {
    const html = `<a href="/file1.pdf">F1</a><a href="/file2.pdf">F2</a>`
    const result = detectWithPatterns(html)
    expect(result?.strategy).toBe('pattern')
  })

  it('should identify common path patterns', () => {
    const html = `
      /downloads/page1.pdf
      /downloads/page2.pdf
      /downloads/page3.pdf
      /downloads/page4.pdf
      /downloads/page5.pdf
    `
    const result = detectWithPatterns(html)
    expect(result).toBeDefined()
    expect(result?.pdfUrls).toHaveLength(5)
  })
})
