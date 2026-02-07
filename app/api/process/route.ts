import { NextRequest, NextResponse } from 'next/server'
import { handleFileUpload } from '@/lib/pdf-processor'
import { handleUrlDownload } from '@/lib/url-scraper'
import { uploadToS3 } from '@/lib/s3-client'
import { createGridPdf } from '@/lib/grid-creator'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const gridLayout = formData.get('gridLayout') as string
    const files = formData.getAll('files') as File[]
    const url = formData.get('url') as string

    // Validate input
    if (!gridLayout || !['3x2', '2x3', '4x1', '2x2'].includes(gridLayout)) {
      return NextResponse.json(
        { message: 'Invalid grid layout' },
        { status: 400 }
      )
    }

    let pdfPaths: string[] = []

    // Handle file upload or URL download
    if (files && files.length > 0) {
      // Validate files
      if (files.length > 20) {
        return NextResponse.json(
          { message: 'Maximum 20 PDFs allowed' },
          { status: 400 }
        )
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0)
      if (totalSize > 100 * 1024 * 1024) {
        return NextResponse.json(
          { message: 'Total file size exceeds 100MB' },
          { status: 400 }
        )
      }

      // Process uploaded files
      pdfPaths = await handleFileUpload(files)
    } else if (url) {
      // Validate URL
      try {
        new URL(url)
      } catch {
        return NextResponse.json(
          { message: 'Invalid URL format' },
          { status: 400 }
        )
      }

      // Download PDFs from URL
      pdfPaths = await handleUrlDownload(url)

      if (pdfPaths.length === 0) {
        return NextResponse.json(
          { message: 'No PDFs found at the provided URL' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { message: 'Please provide either files or a URL' },
        { status: 400 }
      )
    }

    // Create grid PDF
    const gridPdfPath = await createGridPdf(pdfPaths, gridLayout)

    // Upload to S3
    const { downloadUrl, filename } = await uploadToS3(gridPdfPath)

    // Clean up temp files
    // (S3 lifecycle policy handles cleanup, but we can add local cleanup here)

    return NextResponse.json({
      downloadUrl,
      filename,
      pageCount: Math.ceil(pdfPaths.length / getLayoutCount(gridLayout)),
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { message: 'Failed to process your request. Please try again.' },
      { status: 500 }
    )
  }
}

function getLayoutCount(layout: string): number {
  const counts: { [key: string]: number } = {
    '3x2': 6,
    '2x3': 6,
    '4x1': 4,
    '2x2': 4,
  }
  return counts[layout] || 6
}
