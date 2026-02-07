import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const TMP_DIR = '/tmp/coloring-book'

interface GridConfig {
  width: number
  height: number
  padding: number
}

const GRID_CONFIGS: { [key: string]: GridConfig } = {
  '3x2': { width: 3, height: 2, padding: 20 },
  '2x3': { width: 2, height: 3, padding: 20 },
  '4x1': { width: 4, height: 1, padding: 20 },
  '2x2': { width: 2, height: 2, padding: 20 },
}

export async function createGridPdf(
  pdfPaths: string[],
  gridLayout: string
): Promise<string> {
  const config = GRID_CONFIGS[gridLayout] || GRID_CONFIGS['3x2']
  const outputPath = path.join(TMP_DIR, `grid_${Date.now()}.pdf`)

  // For now, we'll use a Python subprocess to call the existing script
  // This bridges the Node.js world with the existing Python functionality
  return new Promise((resolve, reject) => {
    // Create a temporary directory for this batch
    const batchDir = path.join(TMP_DIR, `batch_${Date.now()}`)
    fs.mkdirSync(batchDir, { recursive: true })

    // Copy PDFs to batch directory
    pdfPaths.forEach((pdf, index) => {
      const dest = path.join(batchDir, `${index + 1}.pdf`)
      fs.copyFileSync(pdf, dest)
    })

    // Call the Python script
    const pythonScript = path.join(
      process.cwd(),
      '../coloring-book/combine_pdfs_grid.py'
    )

    // Build the grid argument string
    const gridArg = `${config.width}x${config.height}`

    const python = spawn('python3', [pythonScript, batchDir, '--output', outputPath])

    let errorOutput = ''

    python.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    python.on('close', (code) => {
      // Clean up batch directory
      fs.rmSync(batchDir, { recursive: true, force: true })

      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath)
      } else {
        reject(
          new Error(
            `Failed to create grid PDF: ${errorOutput || 'Unknown error'}`
          )
        )
      }
    })

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })
  })
}
