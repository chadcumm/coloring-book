import { NextRequest, NextResponse } from 'next/server'

const VALID_LAYOUTS = ['3x2', '2x3', '4x1', '2x2']
const MAX_FILES = 20

function isValidGridLayout(layout: string): boolean {
  return VALID_LAYOUTS.includes(layout)
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const gridLayout = formData.get('gridLayout') as string
    const files = formData.getAll('files') as File[]
    const url = formData.get('url') as string

    // Validate grid layout
    if (!gridLayout) {
      return NextResponse.json(
        { message: 'Grid layout is required' },
        { status: 400 }
      )
    }

    if (!isValidGridLayout(gridLayout)) {
      return NextResponse.json(
        { message: `Invalid grid layout. Must be one of: ${VALID_LAYOUTS.join(', ')}` },
        { status: 400 }
      )
    }

    // Check that either files or URL is provided
    if (files.length === 0 && !url) {
      return NextResponse.json(
        { message: 'Please provide either files or URL' },
        { status: 400 }
      )
    }

    // Handle file upload
    if (files.length > 0) {
      if (files.length > MAX_FILES) {
        return NextResponse.json(
          { message: `Maximum ${MAX_FILES} files allowed` },
          { status: 400 }
        )
      }

      console.log(`Processing ${files.length} files with grid layout ${gridLayout}`)
      // TODO: Implement PDF processing
      return NextResponse.json({
        message: 'PDF processing coming soon',
        downloadUrl: null,
      })
    }

    // Handle URL scraping
    if (url) {
      if (!isValidUrl(url)) {
        return NextResponse.json(
          { message: 'Invalid URL format. Must be a valid HTTP or HTTPS URL.' },
          { status: 400 }
        )
      }

      console.log(`Scraping PDFs from ${url} with grid layout ${gridLayout}`)
      // TODO: Implement URL scraping and PDF processing
      return NextResponse.json({
        message: 'URL scraping coming soon',
        downloadUrl: null,
      })
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'PDF processing API ready' })
}
