import { PDFDocument } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'

async function createTestPdfs() {
  const pdfsDir = path.join(__dirname, 'pdfs')
  await fs.mkdir(pdfsDir, { recursive: true })

  // Small PDF (1 page)
  {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    page.drawText('Test PDF - Small (100 KB)', {
      x: 50,
      y: 750,
      size: 24,
    })
    const pdfBytes = await pdfDoc.save()
    const smallPath = path.join(pdfsDir, 'small.pdf')
    await fs.writeFile(smallPath, pdfBytes)
    console.log(`✅ Created small.pdf`)
  }

  // Medium PDF (5 pages)
  {
    const pdfDoc = await PDFDocument.create()
    for (let i = 0; i < 5; i++) {
      const page = pdfDoc.addPage([612, 792])
      page.drawText(`Test PDF - Medium (1 MB) - Page ${i + 1}`, {
        x: 50,
        y: 750,
        size: 24,
      })
    }
    const pdfBytes = await pdfDoc.save()
    const mediumPath = path.join(pdfsDir, 'medium.pdf')
    await fs.writeFile(mediumPath, pdfBytes)
    console.log(`✅ Created medium.pdf`)
  }

  // Large PDF (50 pages)
  {
    const pdfDoc = await PDFDocument.create()
    for (let i = 0; i < 50; i++) {
      const page = pdfDoc.addPage([612, 792])
      page.drawText(`Test PDF - Large (10 MB) - Page ${i + 1}`, {
        x: 50,
        y: 750,
        size: 24,
      })
    }
    const pdfBytes = await pdfDoc.save()
    const largePath = path.join(pdfsDir, 'large.pdf')
    await fs.writeFile(largePath, pdfBytes)
    console.log(`✅ Created large.pdf`)
  }

  // Corrupted PDF
  {
    const corruptedPath = path.join(pdfsDir, 'corrupted.pdf')
    await fs.writeFile(corruptedPath, 'This is not a valid PDF file')
    console.log(`✅ Created corrupted.pdf`)
  }
}

createTestPdfs().catch(console.error)
