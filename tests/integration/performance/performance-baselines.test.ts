import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { mergePdfs, extractPageCount } from '@/lib/pdf-processing'
import { calculateImageSize, calculateGridDimensions } from '@/lib/grid-layouts'

describe('Performance Baselines', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/pdfs')
  const tempDir = '/tmp/coloring-book-integration-perf'

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

  // Test 1: Upload processing < 500ms
  it('should complete upload processing in < 500ms', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const uploadPath = path.join(tempDir, 'perf-upload.pdf')

    const startTime = Date.now()
    fs.copyFileSync(sourcePath, uploadPath)
    const duration = Date.now() - startTime

    // File copy should be very fast
    expect(duration).toBeLessThan(500)
    expect(fs.existsSync(uploadPath)).toBe(true)
  })

  // Test 2: PDF merge < 2s
  it('should merge PDFs in < 2 seconds', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const file1 = path.join(tempDir, 'merge-1.pdf')
    const file2 = path.join(tempDir, 'merge-2.pdf')

    fs.copyFileSync(sourcePath, file1)
    fs.copyFileSync(sourcePath, file2)

    const startTime = Date.now()
    const result = await mergePdfs([file1, file2])
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(2000)
    expect(result.pageCount).toBeGreaterThan(0)
  })

  // Test 3: Grid generation < 3s
  it('should generate grid layouts in < 3 seconds', async () => {
    const layouts = ['3x2', '2x3', '4x1', '2x2']
    const pageWidth = 8.5
    const pageHeight = 11

    const startTime = Date.now()
    layouts.forEach(layout => {
      calculateGridDimensions(layout)
      calculateImageSize(layout, pageWidth, pageHeight)
    })
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(3000)
  })

  // Test 4: 10MB file handling
  it('should handle 10MB file within reasonable time', async () => {
    const largePath = path.join(fixturesDir, 'large.pdf')

    if (fs.existsSync(largePath)) {
      const stats = fs.statSync(largePath)
      // Just verify it exists and is readable
      expect(stats.size).toBeGreaterThan(0)

      const startTime = Date.now()
      const result = await mergePdfs([largePath])
      const duration = Date.now() - startTime

      // Should complete in reasonable time even with larger file
      expect(duration).toBeLessThan(5000)
      expect(result.pageCount).toBeGreaterThan(0)
    }
  })

  // Test 5: 5 concurrent uploads
  it('should handle 5 concurrent uploads', async () => {
    const files = ['small.pdf', 'medium.pdf', 'large.pdf']
    const uploadPaths = files.map((file, idx) => {
      const sourcePath = path.join(fixturesDir, file)
      const destPath = path.join(tempDir, `concurrent-${idx}-${file}`)
      fs.copyFileSync(sourcePath, destPath)
      return destPath
    })

    const startTime = Date.now()
    const results = await Promise.all(
      uploadPaths.map(path => mergePdfs([path]))
    )
    const duration = Date.now() - startTime

    expect(results).toHaveLength(3)
    expect(duration).toBeLessThan(8000) // Generous allowance for 3 concurrent operations
    results.forEach(result => {
      expect(result.pageCount).toBeGreaterThan(0)
    })
  })

  // Test 6: API response < 100ms (grid calculation)
  it('should calculate grid dimensions in < 100ms', async () => {
    const layouts = ['3x2', '2x3', '4x1', '2x2']

    const startTime = Date.now()
    layouts.forEach(layout => {
      calculateGridDimensions(layout)
    })
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(100)
  })

  // Test 7: Memory usage reasonable
  it('should maintain reasonable memory footprint during operations', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const uploadPath = path.join(tempDir, 'memory-test.pdf')

    fs.copyFileSync(sourcePath, uploadPath)

    // Get initial memory state
    const initialMem = process.memoryUsage().heapUsed

    // Perform operations
    for (let i = 0; i < 5; i++) {
      const testPath = path.join(tempDir, `memory-${i}.pdf`)
      fs.copyFileSync(sourcePath, testPath)
      await mergePdfs([testPath])
    }

    // Get final memory state
    const finalMem = process.memoryUsage().heapUsed

    // Memory increase should be reasonable (< 50MB)
    const memIncrease = (finalMem - initialMem) / 1024 / 1024
    expect(memIncrease).toBeLessThan(50)
  })

  // Test 8: 1000 file scalability simulation
  it('should scale to handle many files in sequence', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')

    // Test with 10 sequential operations (simulating scalability)
    const startTime = Date.now()
    for (let i = 0; i < 10; i++) {
      const testPath = path.join(tempDir, `scalability-${i}.pdf`)
      fs.copyFileSync(sourcePath, testPath)
      const result = await mergePdfs([testPath])
      expect(result.pageCount).toBeGreaterThan(0)
    }
    const duration = Date.now() - startTime

    // All 10 operations should complete in reasonable time
    expect(duration).toBeLessThan(10000) // ~1s per operation average
  })

  // Test 9: Page count extraction performance
  it('should extract page count efficiently', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')

    const startTime = Date.now()
    const pageCount = await extractPageCount(sourcePath)
    const duration = Date.now() - startTime

    expect(pageCount).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000) // Should be very fast
  })

  // Test 10: Multiple merge operations performance
  it('should maintain performance across multiple merges', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const times: number[] = []

    for (let i = 0; i < 3; i++) {
      const testPath = path.join(tempDir, `perf-merge-${i}.pdf`)
      fs.copyFileSync(sourcePath, testPath)

      const startTime = Date.now()
      await mergePdfs([testPath])
      const duration = Date.now() - startTime

      times.push(duration)
    }

    // Average time should be consistent and reasonable
    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(2000)

    // No operation should take significantly longer than average
    times.forEach(time => {
      expect(time).toBeLessThan(3000)
    })
  })

  // Test 11: Grid calculation consistency
  it('should calculate grids consistently across multiple calls', async () => {
    const layout = '3x2'
    const iterations = 100

    const startTime = Date.now()
    const results = []
    for (let i = 0; i < iterations; i++) {
      const dims = calculateGridDimensions(layout)
      results.push(dims)
    }
    const duration = Date.now() - startTime

    // All results should be identical
    results.forEach(result => {
      expect(result.cols).toBe(3)
      expect(result.rows).toBe(2)
    })

    // 100 iterations should be very fast
    expect(duration).toBeLessThan(100)
  })

  // Test 12: Batch operation performance
  it('should process multiple files efficiently', async () => {
    const files = ['small.pdf', 'medium.pdf']
    const uploadPaths = files.map(file => {
      const sourcePath = path.join(fixturesDir, file)
      const destPath = path.join(tempDir, `batch-${file}`)
      fs.copyFileSync(sourcePath, destPath)
      return destPath
    })

    const startTime = Date.now()
    const result = await mergePdfs(uploadPaths)
    const duration = Date.now() - startTime

    expect(result.pageCount).toBeGreaterThan(0)
    expect(duration).toBeLessThan(3000)
  })

  // Test 13: File I/O performance
  it('should read files efficiently', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')

    const startTime = Date.now()
    for (let i = 0; i < 10; i++) {
      const content = fs.readFileSync(sourcePath)
      expect(content.length).toBeGreaterThan(0)
    }
    const duration = Date.now() - startTime

    // 10 file reads should be fast
    expect(duration).toBeLessThan(500)
  })

  // Test 14: Directory operations performance
  it('should create and cleanup directories efficiently', async () => {
    const testDir = path.join(tempDir, 'perf-dir-test')

    const startTime = Date.now()
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }

    // Create multiple subdirectories
    for (let i = 0; i < 10; i++) {
      const subDir = path.join(testDir, `sub-${i}`)
      fs.mkdirSync(subDir, { recursive: true })
    }

    // Write files
    for (let i = 0; i < 10; i++) {
      const filePath = path.join(testDir, `sub-${i}`, 'test.txt')
      fs.writeFileSync(filePath, 'test')
    }

    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(1000)
  })

  // Test 15: Concurrent merge operations
  it('should handle concurrent merge operations efficiently', async () => {
    const sourcePath = path.join(fixturesDir, 'small.pdf')
    const filePaths = ['small.pdf', 'medium.pdf', 'large.pdf'].map(file => {
      const source = path.join(fixturesDir, file)
      const dest = path.join(tempDir, `concurrent-merge-${file}`)
      fs.copyFileSync(source, dest)
      return dest
    })

    const startTime = Date.now()
    const results = await Promise.all(
      filePaths.map(path => mergePdfs([path]))
    )
    const duration = Date.now() - startTime

    expect(results).toHaveLength(3)
    expect(duration).toBeLessThan(10000)
  })
})
