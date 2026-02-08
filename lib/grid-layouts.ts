/**
 * Grid Layout Utilities
 * Handles grid layout calculations, validation, and image sizing for PDF layouts
 */

// Define valid grid layouts
const VALID_LAYOUTS = ['3x2', '2x3', '4x1', '2x2']

// Define layout configurations
interface LayoutConfig {
  cols: number
  rows: number
}

interface Dimensions {
  width: number
  height: number
}

// Map layout strings to their configurations
const LAYOUT_MAP: Record<string, LayoutConfig> = {
  '3x2': { cols: 3, rows: 2 },
  '2x3': { cols: 2, rows: 3 },
  '4x1': { cols: 4, rows: 1 },
  '2x2': { cols: 2, rows: 2 },
}

// Constants for page sizing
const MARGIN = 0.5 // 0.5 inch margin
const MARGIN_PTS = MARGIN * 72 // Convert to points (1 inch = 72 points)

/**
 * Validates if a layout string is valid
 * @param layout - Layout string in format "colsxrows" (e.g., "3x2")
 * @returns true if layout is valid, false otherwise
 */
export function validateGridLayout(layout: string): boolean {
  if (!layout || typeof layout !== 'string') {
    return false
  }

  return VALID_LAYOUTS.includes(layout)
}

/**
 * Calculates grid dimensions from a layout string
 * @param layout - Layout string in format "colsxrows"
 * @returns Object with cols and rows properties
 * @throws Error if layout is invalid
 */
export function calculateGridDimensions(
  layout: string
): { cols: number; rows: number } {
  if (!validateGridLayout(layout)) {
    throw new Error(`Invalid layout: ${layout}`)
  }

  const config = LAYOUT_MAP[layout]
  return {
    cols: config.cols,
    rows: config.rows,
  }
}

/**
 * Calculates image size for a specific layout and page dimensions
 * @param layout - Layout string in format "colsxrows"
 * @param pageWidth - Page width in inches
 * @param pageHeight - Page height in inches
 * @returns Object with width and height in points
 */
export function calculateImageSize(
  layout: string,
  pageWidth: number,
  pageHeight: number
): { width: number; height: number } {
  if (!validateGridLayout(layout)) {
    throw new Error(`Invalid layout: ${layout}`)
  }

  const config = LAYOUT_MAP[layout]

  // Convert page dimensions to points
  const pageWidthPts = pageWidth * 72
  const pageHeightPts = pageHeight * 72

  // Calculate available space (subtract margins)
  const availableWidth = pageWidthPts - 2 * MARGIN_PTS
  const availableHeight = pageHeightPts - 2 * MARGIN_PTS

  // Calculate image dimensions (divide available space by grid dimensions)
  const imageWidth = availableWidth / config.cols
  const imageHeight = availableHeight / config.rows

  return {
    width: imageWidth,
    height: imageHeight,
  }
}

/**
 * Gets the layout configuration for a specific layout
 * @param layout - Layout string in format "colsxrows"
 * @returns Layout configuration object with cols and rows
 */
export function getGridLayout(
  layout: string
): { cols: number; rows: number } {
  return calculateGridDimensions(layout)
}

/**
 * Gets all available grid layouts
 * @returns Array of valid layout strings
 */
export function getAvailableLayouts(): string[] {
  return [...VALID_LAYOUTS]
}

/**
 * Calculates the total number of images that can fit in a layout
 * @param layout - Layout string in format "colsxrows"
 * @returns Total number of image slots
 */
export function calculateTotalSlots(layout: string): number {
  if (!validateGridLayout(layout)) {
    throw new Error(`Invalid layout: ${layout}`)
  }

  const config = LAYOUT_MAP[layout]
  return config.cols * config.rows
}

/**
 * Validates if a page size is supported
 * @param width - Page width in inches
 * @param height - Page height in inches
 * @returns true if page size is valid, false otherwise
 */
export function isValidPageSize(width: number, height: number): boolean {
  // Check for positive dimensions
  return width > 0 && height > 0
}
