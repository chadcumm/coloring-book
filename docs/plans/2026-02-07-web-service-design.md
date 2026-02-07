# Coloring Book Grid Service - Design Document

**Date**: 2026-02-07
**Status**: Approved
**Tech Stack**: Next.js (modern), Node.js (modern), AWS SST + Pulumi, GitHub Actions

---

## Overview

Transform the existing PDF downloader and grid combiner scripts into a serverless web service with a simple, flexible UI. Users can upload PDFs or download from a URL, select grid layout, and get a combined PDF.

---

## Architecture

**Deployment Model**: AWS Serverless (SST + Pulumi)
- **Frontend**: Next.js React (single-page app)
- **Backend**: Next.js API routes (Lambda serverless functions)
- **Storage**: AWS S3 (temporary files, 1-hour auto-delete)
- **CI/CD**: GitHub Actions (auto-deploy on push to main)
- **Network**: API Gateway + CloudFront (optional CDN)

**Why serverless**: Scales from zero, minimal operational overhead, cost-efficient for modest usage, no infrastructure to manage.

---

## User Workflow

### Input (Tab 1: Upload PDFs)
- Drag-and-drop or file picker
- Multiple PDFs allowed
- Client validates file format before upload

### Input (Tab 2: Download from URL)
- Text input for website URL
- Server scrapes for PDF links and downloads them

### Processing
1. User selects grid layout: 3x2 (default), 2x3, 4x1, or 2x2
2. Clicks "Create Grid PDF"
3. Backend processes:
   - Converts PDFs to images (using pdf2image equivalent)
   - Creates grid layout (reuses combine_pdfs_grid.py logic)
   - Generates final PDF
   - Uploads to S3 with 1-hour expiry
4. Returns signed download URL
5. User downloads result

### Constraints
- Max 20 PDFs per request
- Max 100MB total file size
- 5-minute processing timeout
- Grid layout presets only (no custom sizing)
- Temporary storage only (no persistent file history)

---

## API Design

### POST `/api/process`

**Request Body**:
```json
{
  "gridLayout": "3x2|2x3|4x1|2x2",
  "files": [File, File, ...] // multipart upload OR
  "url": "https://example.com/coloring-pages"
}
```

**Response** (200 OK):
```json
{
  "downloadUrl": "https://s3.../file-xyz.pdf?X-Amz-Signature=...",
  "filename": "coloring-grid-20260207-xyz.pdf",
  "pageCount": 3
}
```

**Error Responses**:
- 400: Invalid format, invalid URL, too many files, oversized
- 500: Processing failure (with user-friendly message)

### GET `/api/download/:fileId`
- Streams PDF from S3
- Optional: Delete file after download (S3 lifecycle handles it anyway)

---

## Frontend Design

**Single-page layout**:
1. Header: "Coloring Book Grid Maker"
2. Two tabs: "Upload PDFs" | "Download from URL"
3. Upload/URL input
4. Grid layout selector (buttons: 3x2, 2x3, 4x1, 2x2)
5. "Create Grid PDF" button
6. Progress indicator (downloading → processing → complete)
7. Download button (shown on success)
8. Error message display (on failure)

**Behavior**:
- Form validation before submission
- Show file count after selection
- Spinner with status messages during processing
- No preview, reordering, or file deletion
- Responsive design (mobile-friendly)

---

## Data Flow

### Upload PDFs Flow:
1. User selects files → validates → POST to `/api/process`
2. Backend stores files temporarily in Lambda `/tmp`
3. Converts PDFs to images, creates grid, generates PDF
4. Uploads result to S3 (1-hour lifecycle)
5. Returns signed download URL
6. Frontend shows download button
7. User downloads → S3 streams file

### Download from URL Flow:
1. User enters URL → POST to `/api/process`
2. Backend scrapes URL for PDF links (reuses download_pdfs.py logic)
3. Downloads PDFs to temporary storage
4. Converts to images, creates grid, generates PDF
5. Uploads to S3
6. Rest same as above

### Cleanup:
- S3 lifecycle policy: auto-delete all objects older than 1 hour
- No manual cleanup needed
- Lambda `/tmp` auto-cleaned after invocation

---

## Deployment Strategy

**Infrastructure as Code** (Pulumi + SST):
- API Gateway → Lambda
- S3 bucket with lifecycle policy
- CloudFront (optional, for static assets)
- IAM role with S3 permissions

**CI/CD** (GitHub Actions):
- Trigger: push to `main` branch
- Steps: checkout → install → build → deploy (via `pulumi up`)
- Uses AWS CLI admin profile (no additional auth setup needed)

**Hostname**:
- Initial: API Gateway auto-generated URL (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com`)
- Future: Can map custom domain to CloudFront

---

## Tech Implementation Notes

### Reusing Existing Scripts:
1. **download_pdfs.py logic**: Wrap in Node.js (keep Python subprocess OR port to Node)
2. **combine_pdfs_grid.py logic**: Rewrite in Node.js using pdf-lib or pdfkit for PDF generation

### Node.js Libraries:
- `pdf2image` equivalent: Consider `pdfjs` or subprocess to `poppler-utils`
- Grid creation: `sharp` for image manipulation + `pdfkit` or `pdf-lib` for PDF generation
- PDF handling: `pdf-lib` for lightweight operations

### Environment Variables:
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `S3_BUCKET`: S3 bucket name for temporary files
- `NODE_ENV`: development or production

---

## Testing Strategy

**Unit Tests**:
- Grid layout math (verify 3x2 creates 6-per-page)
- File validation (reject non-PDFs)
- Input validation (URL format, file sizes)
- Error handling

**Integration Tests**:
- End-to-end: upload PDFs → receive grid PDF
- Verify output PDF is valid
- Check page count matches expected

**Manual Testing**:
- Test both upload and URL download flows
- Verify grid layouts (3x2, 2x3, 4x1, 2x2)
- Error cases (bad URL, oversized files)

---

## Success Criteria

✅ Users can upload multiple PDFs
✅ Users can paste URL to download PDFs
✅ Grid layout selectable (4 preset options)
✅ Combined PDF downloads successfully
✅ Deploys to AWS with GitHub Actions
✅ Temporary storage only (privacy/cost)
✅ No custom domain required initially
✅ Responsive UI (mobile + desktop)

---

## Future Enhancements (Out of Scope)

- Custom grid sizes
- Image preview before combining
- Drag-to-reorder PDFs
- Persistent file storage
- User authentication
- Custom domain setup
