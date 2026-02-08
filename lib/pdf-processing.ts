import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

export interface MergeResult {
  pageCount: number
  outputPath?: string
}

const TMP_DIR = '/tmp/coloring-book'

/**
 * Validates if a MIME type is application/pdf
 */
export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Validates if a file has a PDF extension
 */
export function validatePdfFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  return ext === '.pdf'
}

/**
 * Calculates human-readable file size
 */
export function calculateFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} ${units[unitIndex]}`
  }
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`
}

/**
 * Extracts page count from a PDF file
 */
export async function extractPageCount(filePath: string): Promise<number> {
  try {
    const pdfBytes = fs.readFileSync(filePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    return pdfDoc.getPageCount()
  } catch (error) {
    throw new Error(
      `Failed to extract page count from ${filePath}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

/**
 * Merges multiple PDF files into a single document
 */
export async function mergePdfs(pdfPaths: string[]): Promise<MergeResult> {
  if (!Array.isArray(pdfPaths) || pdfPaths.length === 0) {
    throw new Error('PDF paths array is required and cannot be empty')
  }

  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true })
    }

    const pdfDoc = await PDFDocument.create()
    let totalPages = 0

    for (const pdfPath of pdfPaths) {
      try {
        // Validate file exists
        if (!fs.existsSync(pdfPath)) {
          throw new Error(`File not found: ${pdfPath}`)
        }

        // Load the source PDF
        const pdfBytes = fs.readFileSync(pdfPath)
        const srcPdf = await PDFDocument.load(pdfBytes)

        // Copy all pages from source to destination
        const pageCount = srcPdf.getPageCount()
        const pageIndices = Array.from({ length: pageCount }, (_, i) => i)
        const copiedPages = await pdfDoc.copyPages(srcPdf, pageIndices)

        // Add all copied pages to the result
        for (const copiedPage of copiedPages) {
          pdfDoc.addPage(copiedPage)
        }

        totalPages += pageCount
      } catch (error) {
        throw new Error(
          `Failed to process PDF ${pdfPath}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }

    // Generate output path
    const outputPath = path.join(TMP_DIR, `merged_${Date.now()}.pdf`)

    // Save the result
    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(outputPath, pdfBytes)

    return {
      pageCount: totalPages,
      outputPath,
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(
          `Failed to merge PDFs: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
  }
}
