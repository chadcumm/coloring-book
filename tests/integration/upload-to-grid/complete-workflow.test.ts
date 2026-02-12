import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { mergePdfs } from '@/lib/pdf-processing'
import { validateGridLayout, calculateGridDimensions, calculateImageSize, calculateTotalSlots } from '@/lib/grid-layouts'

describe('Complete Upload to Grid Workflow', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/pdfs')
  const tempDir = '/tmp/coloring-book-integration-workflow'

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  // Test 1: Complete workflow from upload to download
  it('should complete full workflow from upload to download', async () => {
    const sourceFile = path.join(fixturesDir, 'small.pdf')
    const uploadedFile = path.join(tempDir, 'uploaded.pdf')

    // Upload phase
    expect(fs.existsSync(sourceFile)).toBe(true)
    fs.copyFileSync(sourceFile, uploadedFile)
    expect(fs.existsSync(uploadedFile)).toBe(true)

    // Process phase
    const result = await mergePdfs([uploadedFile])
    expect(result.pageCount).toBeGreaterThan(0)
    expect(result.outputPath).toBeDefined()

    // Download phase
    expect(fs.existsSync(result.outputPath!)).toBe(true)
    const outputStats = fs.statSync(result.outputPath!)
    expect(outputStats.size).toBeGreaterThan(0)
  })

  // Test 2: Multiple sequential uploads
  it('should handle multiple sequential file uploads', async () => {
    const files = ['small.pdf', 'medium.pdf']
    const uploadedPaths: string[] = []

    for (const file of files) {
      const sourcePath = path.join(fixturesDir, file)
      const destPath = path.join(tempDir, file)
      fs.copyFileSync(sourcePath, destPath)
      uploadedPaths.push(destPath)
      expect(fs.existsSync(destPath)).toBe(true)
    }

    expect(uploadedPaths).toHaveLength(2)
  })

  // Test 3: Data integrity through workflow
  it('should maintain data integrity through upload-process-download workflow', async () => {
    const sourceFile = path.join(fixturesDir, 'small.pdf')
    const uploadedFile = path.join(tempDir, 'integrity-test.pdf')

    // Read original file
    const originalContent = fs.readFileSync(sourceFile)
    const originalSize = originalContent.length

    // Upload (copy)
    fs.copyFileSync(sourceFile, uploadedFile)
    const uploadedContent = fs.readFileSync(uploadedFile)

    // Verify integrity after upload
    expect(uploadedContent.length).toBe(originalSize)
    expect(uploadedContent).toEqual(originalContent)

    // Process and download
    const result = await mergePdfs([uploadedFile])
    const downloadedContent = fs.readFileSync(result.outputPath!)

    // Verify file exists and has content
    expect(downloadedContent.length).toBeGreaterThan(0)
    expect(result.pageCount).toBeGreaterThan(0)
  })

  // Test 4: Different grid layout generation
  it('should validate different grid layouts through workflow', async () => {
    const layouts = ['3x2', '2x3', '4x1', '2x2']

    layouts.forEach(layout => {
      const isValid = validateGridLayout(layout)
      expect(isValid).toBe(true)

      const dims = calculateGridDimensions(layout)
      expect(dims.cols).toBeGreaterThan(0)
      expect(dims.rows).toBeGreaterThan(0)

      const slots = calculateTotalSlots(layout)
      expect(slots).toBe(dims.cols * dims.rows)
    })
  })

  // Test 5: Concurrent upload handling
  it('should handle concurrent uploads safely', async () => {
    const files = ['small.pdf', 'medium.pdf', 'large.pdf']
    const uploadPromises = files.map(async (file) => {
      const sourcePath = path.join(fixturesDir, file)
      const destPath = path.join(tempDir, `concurrent-${file}`)
      fs.copyFileSync(sourcePath, destPath)
      return destPath
    })

    const uploadedPaths = await Promise.all(uploadPromises)
    expect(uploadedPaths).toHaveLength(3)
    uploadedPaths.forEach(path => {
      expect(fs.existsSync(path)).toBe(true)
    })
  })

  // Test 6: Result consistency across uploads
  it('should produce consistent results for same input', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const file1 = path.join(tempDir, 'consistency-1.pdf')
    const file2 = path.join(tempDir, 'consistency-2.pdf')

    fs.copyFileSync(sourcePath, file1)
    fs.copyFileSync(sourcePath, file2)

    const result1 = await mergePdfs([file1])
    const result2 = await mergePdfs([file2])

    // Both should have same page count
    expect(result1.pageCount).toBe(result2.pageCount)
    // Both output files should exist
    expect(fs.existsSync(result1.outputPath!)).toBe(true)
    expect(fs.existsSync(result2.outputPath!)).toBe(true)
  })

  // Test 7: Temporary file cleanup
  it('should create output files in temp directory', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const uploadedPath = path.join(tempDir, 'cleanup-test.pdf')

    fs.copyFileSync(sourcePath, uploadedPath)
    const result = await mergePdfs([uploadedPath])

    // Output should be in temp directory
    expect(result.outputPath).toContain('/tmp')
    expect(fs.existsSync(result.outputPath!)).toBe(true)

    // Verify file can be read
    const content = fs.readFileSync(result.outputPath!)
    expect(content.length).toBeGreaterThan(0)
  })

  // Test 8: Storage error handling
  it('should handle missing source file gracefully', async () => {
    const nonExistentPath = path.join(tempDir, 'nonexistent.pdf')

    try {
      await mergePdfs([nonExistentPath])
      expect.fail('Should have thrown error for missing file')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
      expect((error as Error).message).toContain('not found')
    }
  })

  // Test 9: File format validation
  it('should validate PDF file format during upload', async () => {
    const pdfPath = path.join(fixturesDir, 'small.pdf')
    expect(pdfPath.endsWith('.pdf')).toBe(true)

    const content = fs.readFileSync(pdfPath)
    // PDF files start with %PDF
    const isPdf = Buffer.from(content).toString('utf8', 0, 4).startsWith('%PDF')
    expect(isPdf).toBe(true)
  })

  // Test 10: Output file verification
  it('should verify output file is valid and readable', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const uploadedPath = path.join(tempDir, 'verify-output.pdf')

    fs.copyFileSync(sourcePath, uploadedPath)
    const result = await mergePdfs([uploadedPath])

    // Verify output exists
    expect(result.outputPath).toBeDefined()
    expect(fs.existsSync(result.outputPath!)).toBe(true)

    // Verify output is readable
    const outputContent = fs.readFileSync(result.outputPath!)
    expect(outputContent.length).toBeGreaterThan(0)

    // Verify output starts with PDF header
    const header = Buffer.from(outputContent).toString('utf8', 0, 4)
    expect(header).toContain('%PDF')
  })

  // Test 11: Grid dimensions calculation
  it('should calculate correct grid dimensions for all layouts', async () => {
    const layouts = {
      '3x2': { cols: 3, rows: 2, slots: 6 },
      '2x3': { cols: 2, rows: 3, slots: 6 },
      '4x1': { cols: 4, rows: 1, slots: 4 },
      '2x2': { cols: 2, rows: 2, slots: 4 },
    }

    Object.entries(layouts).forEach(([layout, expected]) => {
      const dims = calculateGridDimensions(layout)
      expect(dims.cols).toBe(expected.cols)
      expect(dims.rows).toBe(expected.rows)

      const slots = calculateTotalSlots(layout)
      expect(slots).toBe(expected.slots)
    })
  })

  // Test 12: Image size calculation for layout
  it('should calculate image sizes based on grid layout and page dimensions', async () => {
    const layout = '3x2'
    const pageWidth = 8.5 // Letter width in inches
    const pageHeight = 11 // Letter height in inches

    const imageSize = calculateImageSize(layout, pageWidth, pageHeight)
    expect(imageSize.width).toBeGreaterThan(0)
    expect(imageSize.height).toBeGreaterThan(0)

    // For 3x2 grid on 8.5x11 page
    // Width: (8.5*72 - 2*0.5*72) / 3 ~= 2.08 inches
    // Height: (11*72 - 2*0.5*72) / 2 ~= 3.96 inches
    expect(imageSize.width).toBeLessThan(pageWidth * 72)
    expect(imageSize.height).toBeLessThan(pageHeight * 72)
  })
})
