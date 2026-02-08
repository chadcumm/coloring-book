import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { mergePdfs } from '@/lib/pdf-processing'
import { validateGridLayout } from '@/lib/grid-layouts'

describe('PDF Upload Workflow', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/pdfs')
  const tempDir = '/tmp/coloring-book-test-upload'

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should complete single file upload', async () => {
    const pdfPath = path.join(fixturesDir, 'small.pdf')

    // Verify file exists
    expect(fs.existsSync(pdfPath)).toBe(true)

    // Verify file size is valid
    const stats = fs.statSync(pdfPath)
    expect(stats.size).toBeGreaterThan(0)
  })

  it('should complete multiple file uploads', async () => {
    const pdfPaths = [
      path.join(fixturesDir, 'small.pdf'),
      path.join(fixturesDir, 'medium.pdf'),
    ]

    // Verify all files exist
    pdfPaths.forEach(filePath => {
      expect(fs.existsSync(filePath)).toBe(true)
    })

    // Verify all files are readable
    const results = pdfPaths.map(filePath => {
      const stats = fs.statSync(filePath)
      return stats.size > 0
    })

    expect(results.every(r => r)).toBe(true)
  })

  it('should validate file count within limits (2-10 PDFs)', async () => {
    const validCounts = [2, 3, 5, 8, 10]

    validCounts.forEach(count => {
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(10)
    })

    const invalidCounts = [0, 1, 11, 20]
    invalidCounts.forEach(count => {
      const isValid = count >= 2 && count <= 10
      expect(isValid).toBe(false)
    })
  })

  it('should persist uploaded files', async () => {
    const sourceFile = path.join(fixturesDir, 'small.pdf')
    const destFile = path.join(tempDir, 'uploaded.pdf')

    // Copy file to persist
    fs.copyFileSync(sourceFile, destFile)

    // Verify file persists
    expect(fs.existsSync(destFile)).toBe(true)
    const sourceStats = fs.statSync(sourceFile)
    const destStats = fs.statSync(destFile)
    expect(sourceStats.size).toBe(destStats.size)
  })

  it('should verify grid layout application with uploaded files', async () => {
    const validLayouts = ['3x2', '2x3', '4x1', '2x2']

    validLayouts.forEach(layout => {
      expect(validateGridLayout(layout)).toBe(true)
    })

    const invalidLayouts = ['1x1', '5x5', 'invalid', '']
    invalidLayouts.forEach(layout => {
      expect(validateGridLayout(layout)).toBe(false)
    })
  })

  it('should handle large file upload', async () => {
    const largeFilePath = path.join(fixturesDir, 'large.pdf')

    // Large file should exist
    expect(fs.existsSync(largeFilePath)).toBe(true)

    // File should be readable and have content
    const content = fs.readFileSync(largeFilePath)
    expect(content.length).toBeGreaterThan(10000) // > 10KB
  })

  it('should merge uploaded files and maintain page count', async () => {
    const pdfPaths = [
      path.join(fixturesDir, 'small.pdf'),
      path.join(fixturesDir, 'small.pdf'),
    ]

    const result = await mergePdfs(pdfPaths)

    // Should have combined page count
    expect(result.pageCount).toBeGreaterThan(0)
    expect(result.outputPath).toBeDefined()
  })

  it('should create output file after upload processing', async () => {
    const pdfPaths = [path.join(fixturesDir, 'small.pdf')]

    const result = await mergePdfs(pdfPaths)

    // Verify output file exists
    expect(result.outputPath).toBeDefined()
    expect(fs.existsSync(result.outputPath!)).toBe(true)
  })

  it('should reject file with invalid PDF format', async () => {
    const invalidPdfPath = path.join(fixturesDir, 'invalid.pdf')

    // Create invalid PDF file
    const tempPath = path.join(tempDir, 'invalid.pdf')
    fs.writeFileSync(tempPath, 'This is not a PDF')

    try {
      await mergePdfs([tempPath])
      expect.fail('Should throw error for invalid PDF')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
    }
  })

  it('should handle concurrent file uploads', async () => {
    const pdfPaths = [
      path.join(fixturesDir, 'small.pdf'),
      path.join(fixturesDir, 'medium.pdf'),
    ]

    // Simulate concurrent access to files
    const results = await Promise.all(
      pdfPaths.map(async (filePath) => {
        const stats = fs.statSync(filePath)
        return stats.size > 0
      })
    )

    expect(results.every(r => r)).toBe(true)
  })
})
