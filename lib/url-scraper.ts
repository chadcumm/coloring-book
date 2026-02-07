import axios from 'axios'
import { parse } from 'node-html-parser'
import fs from 'fs'
import path from 'path'
import { writeFile } from 'fs/promises'

const TMP_DIR = '/tmp/coloring-book'

export async function handleUrlDownload(url: string): Promise<string[]> {
  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true })
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    })

    // Parse HTML to find PDF links
    const root = parse(response.data)
    const links = root.querySelectorAll('a')

    const pdfUrls: Set<string> = new Set()

    for (const link of links) {
      const href = link.getAttribute('href')
      if (href && href.toLowerCase().endsWith('.pdf')) {
        try {
          // Convert relative URLs to absolute
          const pdfUrl = new URL(href, url).toString()
          pdfUrls.add(pdfUrl)
        } catch {
          // Skip invalid URLs
        }
      }
    }

    if (pdfUrls.size === 0) {
      throw new Error('No PDF links found on the provided URL')
    }

    // Download each PDF
    const pdfPaths: string[] = []
    let downloadCount = 0

    for (const pdfUrl of pdfUrls) {
      try {
        if (downloadCount >= 20) {
          // Limit to 20 PDFs
          break
        }

        const pdfResponse = await axios.get(pdfUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          timeout: 30000,
          responseType: 'arraybuffer',
        })

        const fileName = extractFileNameFromUrl(pdfUrl)
        const filePath = path.join(TMP_DIR, fileName)

        // Check if file already exists (avoid duplicates)
        if (!fs.existsSync(filePath)) {
          await writeFile(filePath, Buffer.from(pdfResponse.data))
          pdfPaths.push(filePath)
          downloadCount++
        }

        // Small delay to be polite to server
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.warn(`Failed to download PDF from ${pdfUrl}:`, error)
        // Continue with next PDF
      }
    }

    if (pdfPaths.length === 0) {
      throw new Error('Failed to download any PDFs from the provided URL')
    }

    return pdfPaths
  } catch (error) {
    throw new Error(
      `Failed to download PDFs from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

function extractFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    let fileName = path.basename(pathname) || `pdf_${Date.now()}`

    // Ensure .pdf extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf'
    }

    return sanitizeFileName(fileName)
  } catch {
    return `pdf_${Date.now()}.pdf`
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .substring(0, 255)
}
