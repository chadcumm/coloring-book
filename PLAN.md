# Implementation Plan: Coloring Book Grid Service

**Status**: Ready to Execute
**Start Date**: 2026-02-07
**Duration**: Estimated 3-4 hours

---

## Phase 1: Project Setup (30 mins)

### 1.1 Create Next.js project with TypeScript
- Initialize new Next.js app (latest version)
- Configure TypeScript
- Install dependencies (pdf-lib, sharp, axios, etc.)

### 1.2 Setup Pulumi + SST
- Initialize Pulumi stack
- Create AWS resources (S3, API Gateway, Lambda)
- Configure environment variables
- Test local deployment

### 1.3 Setup GitHub Actions
- Create `.github/workflows/deploy.yml`
- Configure AWS credentials (use existing admin profile)
- Test auto-deploy on push

---

## Phase 2: Backend Implementation (90 mins)

### 2.1 Create PDF Processing Module
- Implement PDF to image conversion (pdf2image logic)
- Implement grid layout creation (reuse combine_pdfs_grid.py logic)
- Support 4 preset layouts: 3x2, 2x3, 4x1, 2x2

### 2.2 Create URL Scraping Module
- Implement PDF link scraping (reuse download_pdfs.py logic)
- Implement PDF downloading
- Handle errors gracefully

### 2.3 Create API Routes
- POST `/api/process` endpoint
  - Handle file uploads (multipart)
  - Handle URL input
  - Validate inputs
  - Call processing modules
  - Upload result to S3
  - Return signed download URL
- GET `/api/download/:fileId` endpoint
  - Stream PDF from S3

### 2.4 Setup S3 Integration
- Create S3 client
- Implement file upload to S3
- Generate signed URLs (1-hour expiry)
- Configure lifecycle policy (1-hour auto-delete)

### 2.5 Error Handling
- Input validation errors (400)
- Processing errors (500)
- User-friendly error messages

---

## Phase 3: Frontend Implementation (60 mins)

### 3.1 Create UI Layout
- Header and branding
- Tab navigation (Upload | Download from URL)
- Form components
- Grid layout selector (button group)
- Submit button

### 3.2 Implement Upload Tab
- File input (drag-and-drop or picker)
- File validation (must be PDFs)
- Show file count

### 3.3 Implement URL Tab
- Text input for URL
- URL validation

### 3.4 Implement Processing Flow
- Form submission handler
- API call to `/api/process`
- Progress indicator (spinner)
- Status messages
- Success: Show download button
- Error: Show error message
- Download functionality

### 3.5 Responsive Design
- Mobile-friendly layout
- Touch-friendly buttons
- Proper spacing and sizing

---

## Phase 4: Testing & Deployment (30 mins)

### 4.1 Local Testing
- Test upload flow (single and multiple PDFs)
- Test URL download flow
- Test all 4 grid layouts
- Test error cases
- Verify output PDFs are valid

### 4.2 Deployment
- Deploy to AWS via GitHub Actions
- Verify API is accessible
- Test via deployed URL
- Document API endpoint

### 4.3 Documentation
- Update README with usage instructions
- Document environment variables
- Document deployment process

---

## Detailed Task Breakdown

### Backend Tasks
1. **pdf-processing.ts**: Convert PDFs to images, create grids
2. **url-scraper.ts**: Scrape URLs for PDFs, download them
3. **s3-client.ts**: S3 upload/download, signed URLs
4. **api/process.ts**: Main API endpoint
5. **api/download/[fileId].ts**: Download endpoint
6. **error-handler.ts**: Centralized error handling
7. **validation.ts**: Input validation

### Frontend Tasks
1. **layout/**: Main app layout
2. **components/UploadTab.tsx**: Upload interface
3. **components/UrlTab.tsx**: URL input interface
4. **components/GridSelector.tsx**: Layout selector
5. **components/ProgressIndicator.tsx**: Progress spinner
6. **pages/index.tsx**: Main page
7. **styles/**: Tailwind CSS styling

### Infrastructure Tasks
1. **Pulumi.yaml**: Resource definitions
2. **.github/workflows/deploy.yml**: CI/CD pipeline
3. **.env.example**: Environment variable template
4. **package.json**: Dependencies and scripts

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Next.js with TypeScript | Modern, full-stack, easy deployment with SST |
| AWS S3 + Lifecycle | Cheapest storage, auto-cleanup, no DB needed |
| Temporary files only | Privacy, cost, simplicity |
| 4 preset layouts | Meets user needs, keeps UI simple |
| Pulumi + SST | Infrastructure as code, reproducible, version-controlled |
| GitHub Actions | Native GitHub integration, free for public repos |

---

## Success Criteria

- ✅ Web UI accessible at API Gateway URL
- ✅ Upload PDFs flow works end-to-end
- ✅ Download from URL flow works end-to-end
- ✅ All 4 grid layouts produce correct output
- ✅ Auto-deploy via GitHub Actions works
- ✅ No errors in CloudWatch logs
- ✅ S3 files auto-delete after 1 hour
- ✅ Output PDFs are valid and usable

---

## Notes

- Reuse logic from existing Python scripts where possible
- Keep UI minimal and focused (no nice-to-haves)
- Test error paths thoroughly (bad URLs, oversized files, etc.)
- Document decisions made during implementation
