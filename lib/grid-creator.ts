import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

const TMP_DIR = '/tmp/coloring-book'

export async function createGridPdf(
  pdfPaths: string[],
  _gridLayout: string // Grid layout selection for future use
): Promise<string> {
  try {
    const outputPath = path.join(TMP_DIR, `grid_${Date.now()}.pdf`)

    // Merge PDFs into a combined document
    // Note: Current implementation combines PDFs sequentially.
    // For true grid layout (multiple PDFs per page), we'd need PDF-to-image
    // conversion, which requires additional setup with libraries like pdf2image
    // or canvas support.
    await mergePdfs(pdfPaths, outputPath)

    return outputPath
  } catch (error) {
    throw new Error(
      `Failed to create grid PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

async function mergePdfs(pdfPaths: string[], outputPath: string): Promise<void> {
  const pdfDoc = await PDFDocument.create()

  for (const pdfPath of pdfPaths) {
    try {
      // Load the source PDF
      const pdfBytes = fs.readFileSync(pdfPath)
      const srcPdf = await PDFDocument.load(pdfBytes)

      // Copy all pages from source to destination
      const pageIndices = Array.from(
        { length: srcPdf.getPageCount() },
        (_, i) => i
      )
      const copiedPages = await pdfDoc.copyPages(srcPdf, pageIndices)

      // Add all copied pages to the result
      for (const copiedPage of copiedPages) {
        pdfDoc.addPage(copiedPage)
      }
    } catch (error) {
      console.warn(`Failed to process ${pdfPath}:`, error)
      // Continue with next PDF
    }
  }

  // Save the result
  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(outputPath, pdfBytes)
}
