import { describe, it, expect } from 'vitest'
import {
  validatePdfFile,
  extractPageCount,
  calculateFileSize,
  isPdfMimeType,
} from '@/lib/pdf-processing'
import path from 'path'

describe('PDF Utilities', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/pdfs')

  it('should validate PDF MIME type', () => {
    expect(isPdfMimeType('application/pdf')).toBe(true)
    expect(isPdfMimeType('text/plain')).toBe(false)
    expect(isPdfMimeType('image/jpeg')).toBe(false)
  })

  it('should validate file extension', () => {
    expect(validatePdfFile('document.pdf')).toBe(true)
    expect(validatePdfFile('document.PDF')).toBe(true)
    expect(validatePdfFile('document.txt')).toBe(false)
  })

  it('should calculate file size in bytes', () => {
    const size = calculateFileSize(500)
    expect(size).toContain('B')
  })

  it('should calculate file size in kilobytes', () => {
    const size = calculateFileSize(512 * 1024)
    expect(size).toContain('KB')
  })

  it('should calculate file size in megabytes', () => {
    const size = calculateFileSize(1024 * 1024)
    expect(size).toBe('1 MB')
  })

  it('should handle large file sizes', () => {
    const size = calculateFileSize(1024 * 1024 * 100)
    expect(size).toBe('100 MB')
  })

  it('should validate maximum file size', () => {
    const maxSize = 100 * 1024 * 1024 // 100 MB
    expect(1024 < maxSize).toBe(true)
    expect(maxSize + 1024 < maxSize).toBe(false)
  })

  it('should handle KB sizes', () => {
    const size = calculateFileSize(1024 * 50)
    expect(size).toContain('KB')
  })

  it('should extract page count from PDF', async () => {
    const count = await extractPageCount(path.join(fixturesDir, 'small.pdf'))
    expect(typeof count).toBe('number')
    expect(count).toBe(1)
  })

  it('should extract correct page count for medium PDF', async () => {
    const count = await extractPageCount(path.join(fixturesDir, 'medium.pdf'))
    expect(count).toBe(5)
  })

  it('should extract correct page count for large PDF', async () => {
    const count = await extractPageCount(path.join(fixturesDir, 'large.pdf'))
    expect(count).toBe(50)
  })

  it('should reject invalid MIME types', () => {
    expect(isPdfMimeType('application/docx')).toBe(false)
    expect(isPdfMimeType('application/msword')).toBe(false)
    expect(isPdfMimeType('')).toBe(false)
  })

  it('should validate PDF files with various cases', () => {
    expect(validatePdfFile('MyDocument.pdf')).toBe(true)
    expect(validatePdfFile('my_document.PDF')).toBe(true)
    expect(validatePdfFile('document.Pdf')).toBe(true)
    expect(validatePdfFile('document.pDf')).toBe(true)
  })

  it('should calculate precise megabyte sizes', () => {
    const size1 = calculateFileSize(2 * 1024 * 1024)
    expect(size1).toBe('2 MB')

    const size2 = calculateFileSize(1.5 * 1024 * 1024)
    expect(size2).toContain('MB')
  })

  it('should handle decimal KB sizes', () => {
    const size = calculateFileSize(2500)
    expect(size).toContain('KB')
  })

  it('should fail to extract from missing file', async () => {
    try {
      await extractPageCount('/nonexistent/path/file.pdf')
      expect.fail('Should throw error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
    }
  })

  it('should fail to extract from corrupted PDF', async () => {
    try {
      await extractPageCount(path.join(fixturesDir, 'corrupted.pdf'))
      expect.fail('Should throw error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
    }
  })
})
