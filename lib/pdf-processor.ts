import fs from 'fs'
import path from 'path'
import { writeFile } from 'fs/promises'

const TMP_DIR = '/tmp/coloring-book'

export async function handleFileUpload(files: File[]): Promise<string[]> {
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true })
  }

  const pdfPaths: string[] = []

  for (const file of files) {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error(`Invalid file type: ${file.name}. Only PDFs are allowed.`)
    }

    const buffer = await file.arrayBuffer()
    const fileName = sanitizeFileName(file.name)
    const filePath = path.join(TMP_DIR, fileName)

    // Write file to temp directory
    await writeFile(filePath, Buffer.from(buffer))
    pdfPaths.push(filePath)
  }

  return pdfPaths
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .substring(0, 255)
}
