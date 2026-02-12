import { describe, it, expect } from 'vitest'
import {
  calculateGridDimensions,
  validateGridLayout,
  calculateImageSize,
  getGridLayout,
  getAvailableLayouts,
  calculateTotalSlots,
  isValidPageSize,
} from '@/lib/grid-layouts'

describe('Grid Layout Calculations', () => {
  it('should validate 3x2 layout', () => {
    expect(validateGridLayout('3x2')).toBe(true)
  })

  it('should validate 2x3 layout', () => {
    expect(validateGridLayout('2x3')).toBe(true)
  })

  it('should validate 4x1 layout', () => {
    expect(validateGridLayout('4x1')).toBe(true)
  })

  it('should validate 2x2 layout', () => {
    expect(validateGridLayout('2x2')).toBe(true)
  })

  it('should reject invalid layout', () => {
    expect(validateGridLayout('5x5')).toBe(false)
    expect(validateGridLayout('invalid')).toBe(false)
  })

  it('should reject empty layout', () => {
    expect(validateGridLayout('')).toBe(false)
  })

  it('should reject null layout', () => {
    expect(validateGridLayout(null as any)).toBe(false)
  })

  it('should calculate grid dimensions for 3x2', () => {
    const dims = calculateGridDimensions('3x2')
    expect(dims.cols).toBe(3)
    expect(dims.rows).toBe(2)
  })

  it('should calculate grid dimensions for 2x3', () => {
    const dims = calculateGridDimensions('2x3')
    expect(dims.cols).toBe(2)
    expect(dims.rows).toBe(3)
  })

  it('should calculate grid dimensions for 4x1', () => {
    const dims = calculateGridDimensions('4x1')
    expect(dims.cols).toBe(4)
    expect(dims.rows).toBe(1)
  })

  it('should calculate grid dimensions for 2x2', () => {
    const dims = calculateGridDimensions('2x2')
    expect(dims.cols).toBe(2)
    expect(dims.rows).toBe(2)
  })

  it('should throw error for invalid layout in calculateGridDimensions', () => {
    expect(() => calculateGridDimensions('5x5')).toThrow()
    expect(() => calculateGridDimensions('invalid')).toThrow()
  })

  it('should calculate image size for layout', () => {
    const size = calculateImageSize('3x2', 8.5, 11)
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
  })

  it('should handle standard letter size', () => {
    const size = calculateImageSize('3x2', 8.5, 11)
    // Letter size: 8.5" x 11" = 612 x 792 points
    // With 0.5" margins on each side: 612 - 72 = 540 points
    // Available width: 540, height: 648 (792 - 72)
    // Image width: 540 / 3 = 180, height: 648 / 2 = 324
    expect(size.width).toBeLessThan(8.5 * 72)
    expect(size.height).toBeLessThan(11 * 72)
  })

  it('should get layout config', () => {
    const layout = getGridLayout('3x2')
    expect(layout).toBeDefined()
    expect(layout.cols).toBe(3)
    expect(layout.rows).toBe(2)
  })

  it('should calculate image dimensions for 3x2 correctly', () => {
    const size = calculateImageSize('3x2', 8.5, 11)
    // 8.5 inches = 612 points, margin = 36 points (0.5 * 72)
    // Available width = 612 - 72 = 540 points
    // Available height = 792 - 72 = 720 points
    // Image width = 540 / 3 = 180 points
    // Image height = 720 / 2 = 360 points
    expect(size.width).toBe(180)
    expect(size.height).toBe(360)
  })

  it('should calculate image dimensions for 2x3 correctly', () => {
    const size = calculateImageSize('2x3', 8.5, 11)
    // Available width = 540 points, available height = 720 points
    // Image width = 540 / 2 = 270 points
    // Image height = 720 / 3 = 240 points
    expect(size.width).toBe(270)
    expect(size.height).toBe(240)
  })

  it('should have different dimensions for different layouts', () => {
    const size1 = calculateImageSize('3x2', 8.5, 11)
    const size2 = calculateImageSize('2x3', 8.5, 11)

    // Different layouts should produce different dimensions
    expect(size1.width).not.toBe(size2.width)
    expect(size1.height).not.toBe(size2.height)
  })

  it('should validate page size', () => {
    expect(isValidPageSize(8.5, 11)).toBe(true)
    expect(isValidPageSize(0, 11)).toBe(false)
    expect(isValidPageSize(8.5, 0)).toBe(false)
  })

  it('should handle portrait orientation', () => {
    const size = calculateImageSize('3x2', 8.5, 11)
    // Portrait: height > width
    expect(size.height).toBeGreaterThan(size.width)
  })

  it('should handle landscape orientation', () => {
    const size = calculateImageSize('2x3', 11, 8.5)
    // Landscape: width > height for the page
    // With 2x3 layout: 2 columns, 3 rows
    // Available width = 11*72 - 72 = 720 points
    // Available height = 8.5*72 - 72 = 540 points
    // Image width = 720 / 2 = 360 points
    // Image height = 540 / 3 = 180 points
    expect(size.width).toBeGreaterThan(size.height)
  })

  it('should return available layouts', () => {
    const layouts = getAvailableLayouts()
    expect(layouts).toContain('3x2')
    expect(layouts).toContain('2x3')
    expect(layouts).toContain('4x1')
    expect(layouts).toContain('2x2')
    expect(layouts.length).toBe(4)
  })

  it('should calculate total slots for 3x2', () => {
    const slots = calculateTotalSlots('3x2')
    expect(slots).toBe(6)
  })

  it('should calculate total slots for 2x3', () => {
    const slots = calculateTotalSlots('2x3')
    expect(slots).toBe(6)
  })

  it('should calculate total slots for 4x1', () => {
    const slots = calculateTotalSlots('4x1')
    expect(slots).toBe(4)
  })

  it('should calculate total slots for 2x2', () => {
    const slots = calculateTotalSlots('2x2')
    expect(slots).toBe(4)
  })

  it('should throw error for invalid layout in calculateTotalSlots', () => {
    expect(() => calculateTotalSlots('5x5')).toThrow()
  })

  it('should handle large page dimensions', () => {
    const size = calculateImageSize('3x2', 17, 22)
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
  })

  it('should handle small page dimensions', () => {
    const size = calculateImageSize('3x2', 3, 5)
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
  })

  it('should validate 4x1 layout dimensions', () => {
    const dims = calculateGridDimensions('4x1')
    expect(dims.cols).toBe(4)
    expect(dims.rows).toBe(1)
  })

  it('should calculate consistent dimensions for same layout', () => {
    const size1 = calculateImageSize('3x2', 8.5, 11)
    const size2 = calculateImageSize('3x2', 8.5, 11)
    expect(size1.width).toBe(size2.width)
    expect(size1.height).toBe(size2.height)
  })

  it('should handle negative page dimensions as invalid', () => {
    expect(isValidPageSize(-1, 11)).toBe(false)
    expect(isValidPageSize(8.5, -11)).toBe(false)
  })

  it('should throw error when calculating image size with invalid layout', () => {
    expect(() => calculateImageSize('10x10', 8.5, 11)).toThrow()
  })

  it('should get layout with all valid layouts', () => {
    const layouts = ['3x2', '2x3', '4x1', '2x2']
    for (const layout of layouts) {
      const config = getGridLayout(layout)
      expect(config.cols).toBeGreaterThan(0)
      expect(config.rows).toBeGreaterThan(0)
    }
  })
})
