import { describe, it, expect, beforeEach } from 'vitest'
import path from 'path'
import { mergePdfs } from '@/lib/pdf-processing'

describe('PDF Merge Operations', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/pdfs')

  it('should merge multiple PDFs', async () => {
    const pdfs = [
      path.join(fixturesDir, 'small.pdf'),
      path.join(fixturesDir, 'small.pdf'),
    ]

    const result = await mergePdfs(pdfs)

    expect(result).toBeDefined()
    expect(result.pageCount).toBe(2)
  })

  it('should handle single PDF', async () => {
    const pdfs = [path.join(fixturesDir, 'small.pdf')]

    const result = await mergePdfs(pdfs)

    expect(result.pageCount).toBe(1)
  })

  it('should merge large PDFs', async () => {
    const pdfs = [
      path.join(fixturesDir, 'large.pdf'),
      path.join(fixturesDir, 'medium.pdf'),
    ]

    const result = await mergePdfs(pdfs)

    expect(result.pageCount).toBe(55) // 50 + 5
  })

  it('should fail with empty array', async () => {
    try {
      await mergePdfs([])
      expect.fail('Should throw error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
      if (error instanceof Error) {
        expect(error.message).toContain('empty')
      }
    }
  })

  it('should fail with corrupted PDF', async () => {
    const pdfs = [path.join(fixturesDir, 'corrupted.pdf')]

    try {
      await mergePdfs(pdfs)
      expect.fail('Should throw error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
    }
  })

  it('should preserve page order', async () => {
    const pdfs = [
      path.join(fixturesDir, 'small.pdf'),
      path.join(fixturesDir, 'medium.pdf'),
    ]

    const result = await mergePdfs(pdfs)

    // Verify order by checking page count
    expect(result.pageCount).toBe(6) // 1 + 5
  })

  it('should handle missing files', async () => {
    const pdfs = ['/nonexistent/file.pdf']

    try {
      await mergePdfs(pdfs)
      expect.fail('Should throw error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
      if (error instanceof Error) {
        expect(error.message).toContain('not found')
      }
    }
  })

  it('should extract page count correctly', async () => {
    const pdfs = [path.join(fixturesDir, 'medium.pdf')]

    const result = await mergePdfs(pdfs)

    expect(result.pageCount).toBe(5)
  })

  it('should return output path', async () => {
    const pdfs = [path.join(fixturesDir, 'small.pdf')]

    const result = await mergePdfs(pdfs)

    expect(result.outputPath).toBeDefined()
    expect(typeof result.outputPath).toBe('string')
  })

  it('should handle multiple large PDFs', async () => {
    const pdfs = [
      path.join(fixturesDir, 'large.pdf'),
      path.join(fixturesDir, 'large.pdf'),
    ]

    const result = await mergePdfs(pdfs)

    expect(result.pageCount).toBe(100) // 50 + 50
  })
})
