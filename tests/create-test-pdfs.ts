#!/usr/bin/env node

/**
 * Create test PDF files for testing
 * Generates simple PDFs that can be used in tests
 */

import { PDFDocument, rgb } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'

async function createTestPdf(filename: string, pageCount: number = 1) {
  const pdfDoc = await PDFDocument.create()

  // Create multiple pages
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([612, 792])
    const { height } = page.getSize()

    // Draw a simple design
    page.drawText(`Test Coloring Page ${i + 1}`, {
      x: 50,
      y: height - 100,
      size: 24,
      color: rgb(0, 0, 0),
    })

    page.drawText('This is a test PDF created for testing purposes.', {
      x: 50,
      y: height - 150,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Draw a simple rectangle as a "coloring area"
    page.drawRectangle({
      x: 50,
      y: height - 400,
      width: 200,
      height: 200,
      borderColor: rgb(0, 0, 0),
      borderWidth: 2,
    })

    // Add some circles to color
    for (let j = 0; j < 5; j++) {
      page.drawCircle({
        x: 100 + j * 70,
        y: height - 500 - j * 40,
        size: 30,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      })
    }
  }

  const pdfBytes = await pdfDoc.save()
  await fs.writeFile(filename, pdfBytes)
  console.log(`✅ Created: ${filename}`)
}

async function main() {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures')
  await fs.mkdir(testDir, { recursive: true })

  console.log('Creating test PDF files...\n')

  // Create sample PDFs
  await createTestPdf(path.join(testDir, 'animal-1.pdf'))
  await createTestPdf(path.join(testDir, 'animal-2.pdf'))
  await createTestPdf(path.join(testDir, 'animal-3.pdf'))
  await createTestPdf(path.join(testDir, 'valentine-1.pdf'))
  await createTestPdf(path.join(testDir, 'valentine-2.pdf'))

  console.log(`\n✅ Test PDFs created in ${testDir}`)
}

main().catch((error) => {
  console.error('Error creating test PDFs:', error)
  process.exit(1)
})
