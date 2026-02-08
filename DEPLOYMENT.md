# Coloring Book Grid Service - Deployment Guide

## Quick Start

### Local Development (Next.js Dev Server)

```bash
./start-dev.sh
```

This single command will:
- ✅ Install dependencies if needed
- ✅ Start the Next.js development server on http://localhost:3000
- ✅ Display API testing examples

**Test the API locally:**
```bash
# Health check
curl http://localhost:3000/api/process

# Test URL scraping
curl -X POST http://localhost:3000/api/process \
  -F 'gridLayout=2x2' \
  -F 'url=https://greencoloring.com/animal-coloring-pages/'

# Test file upload
curl -X POST http://localhost:3000/api/process \
  -F 'gridLayout=2x2' \
  -F 'files=@/path/to/document.pdf'
```

### AWS Lambda Deployment

```bash
./setup-lambda.sh
```

This automation will:
1. ✅ Check prerequisites (AWS CLI, zip, Node.js)
2. ✅ Build the Next.js application
3. ✅ Create Lambda handler wrapper
4. ✅ Package everything into a zip file
5. ✅ Create/update Lambda function
6. ✅ Set up API Gateway for HTTP access
7. ✅ Display your live API endpoint

**That's it!** No manual AWS console clicks needed.

---

## Architecture Overview

### Local Development Flow
```
Client (Browser/curl)
    ↓
Next.js Dev Server (http://localhost:3000)
    ↓
/api/process route (TypeScript)
    ↓
PDF Processing Logic
    ↓
Response (JSON)
```

### Production Lambda Flow
```
Client (Browser/curl)
    ↓
API Gateway (HTTP Endpoint)
    ↓
Lambda Function (Next.js Handler)
    ↓
/api/process route (TypeScript)
    ↓
PDF Processing Logic
    ↓
Response (JSON)
```

---

## File Structure

```
coloring-book-web/
├── start-dev.sh              ← Start local development (this is all you need!)
├── setup-lambda.sh           ← Deploy to Lambda (fully automated!)
├── lambda-handler.js         ← Created by setup-lambda.sh
├── DEPLOYMENT.md             ← This file
├── next.config.js            ← Next.js config (API routes enabled)
├── app/
│   ├── page.tsx              ← Frontend UI
│   └── api/
│       └── process/
│           └── route.ts      ← PDF processing endpoint
├── .next/                    ← Build output (created by npm run build)
├── package.json
└── ... (other project files)
```

---

## API Endpoints

### POST /api/process

Process PDFs and return grid layout result.

**Parameters:**
- `gridLayout` (required): Grid dimensions (e.g., "2x2", "3x3", "1x4")
- Either `files` (one or more PDF files) OR `url` (URL to scrape PDFs from)

**Example - File Upload:**
```bash
curl -X POST http://localhost:3000/api/process \
  -F 'gridLayout=2x2' \
  -F 'files=@document1.pdf' \
  -F 'files=@document2.pdf'
```

**Example - URL Scraping:**
```bash
curl -X POST http://localhost:3000/api/process \
  -F 'gridLayout=2x2' \
  -F 'url=https://example.com/coloring-pages/'
```

**Response:**
```json
{
  "message": "PDF processing coming soon",
  "downloadUrl": null
}
```

### GET /api/process

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "PDF processing API ready"
}
```

---

## Environment Setup

### Prerequisites for Lambda Deployment

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   # Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
   ```
3. **zip** command-line tool
   ```bash
   # macOS
   brew install zip

   # Linux (usually pre-installed)
   apt-get install zip
   ```

### Configuration

By default:
- Region: `us-east-1`
- Lambda Memory: 512 MB
- Lambda Timeout: 60 seconds
- Node.js Runtime: 18.x

To customize, edit `setup-lambda.sh` before running.

---

## Development Workflow

Every change follows a two-stage test pipeline: test locally, then deploy and verify in production. See [docs/TESTING.md](docs/TESTING.md) for the full testing guide.

### 1. Make Changes

Start the dev server and make your changes:

```bash
./start-dev.sh
```

Opens http://localhost:3000 with hot reload. Edit source files as needed.

### 2. Test Locally (Stage 1)

Run the full local test suite before deploying:

```bash
# Option A: Run the automated pipeline (recommended)
./scripts/test-and-deploy.sh --local

# Option B: Run each step manually
npm run test:all     # Vitest: unit + system + integration (279 tests)
npm run build        # Verify production build
npm run test:e2e     # Playwright: API + UI browser tests against localhost
```

This covers:
- **API tests (command line):** Health check, process endpoint, error handling
- **UI tests (Playwright browser):** Page rendering, tab navigation, grid selector, form validation, URL submission flow

### 3. Deploy & Verify Production (Stage 2)

Once local tests pass, deploy and run the same tests against the live site:

```bash
# Option A: Full automated pipeline (local + deploy + production)
./scripts/test-and-deploy.sh

# Option B: Deploy manually, then test production
git push origin main
npm run test:e2e:prod   # Playwright e2e against the live S3 site
```

The GitHub Actions workflow also handles this automatically on push to main:
1. **test** job runs Vitest + Playwright against localhost
2. **deploy** job pushes to S3 (only if tests pass)
3. **verify** job runs Playwright against the live URL

### 4. Verify

After Stage 2, your change has been tested both locally and in production. Check the GitHub Actions run for green checkmarks across all three jobs.

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill any process using it
kill -9 <PID>

# Try again
./start-dev.sh
```

### Lambda Deployment Fails

**AWS CLI not configured:**
```bash
aws configure
# Enter your credentials and region
```

**Missing permissions:**
- Ensure your AWS user has Lambda, IAM, and API Gateway permissions
- Consider using an IAM role with `AdministratorAccess` for testing

**Package too large:**
- Keep dependencies minimal
- Remove unused packages from `package.json`
- Use production-only installs: `npm ci --production`

### API Endpoint Returns 502 Bad Gateway

1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/coloring-book-grid-service --follow
   ```

2. Verify Lambda function was created:
   ```bash
   aws lambda get-function --function-name coloring-book-grid-service
   ```

3. Test Lambda directly:
   ```bash
   aws lambda invoke --function-name coloring-book-grid-service output.json
   cat output.json
   ```

---

## Monitoring

### View Lambda Logs

```bash
# Real-time logs
aws logs tail /aws/lambda/coloring-book-grid-service --follow

# Last 5 minutes
aws logs tail /aws/lambda/coloring-book-grid-service --since 5m

# Search for errors
aws logs tail /aws/lambda/coloring-book-grid-service --filter-pattern "ERROR"
```

### Check Lambda Metrics

```bash
# Duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=coloring-book-grid-service \
  --statistics Average \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600
```

---

## Cost Considerations

### AWS Lambda Pricing (US East 1)

- **Requests:** $0.20 per 1M requests
- **Duration:** $0.0000166667 per GB-second
- **Free tier:** 1M requests, 400,000 GB-seconds/month

**Estimated monthly cost with 10,000 requests/month:**
- Requests: $0.00002 (negligible)
- Duration: ~$0.01-0.05 (depending on execution time)
- **Total: ~$0.05/month**

### Cost Optimization Tips

1. **Reduce Lambda timeout** in `setup-lambda.sh` if possible
2. **Reduce memory** from 512 MB if tests show it's not needed
3. **Cache results** to avoid redundant PDF processing
4. **Use S3 for large files** instead of sending through Lambda

---

## Cleanup

### Delete Lambda Resources

```bash
# Delete Lambda function
aws lambda delete-function --function-name coloring-book-grid-service

# Delete API Gateway
aws apigatewayv2 delete-api --api-id <YOUR_API_ID>

# Delete IAM role
aws iam detach-role-policy \
  --role-name coloring-book-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name coloring-book-lambda-role
```

Or just run:
```bash
./setup-lambda.sh  # Re-run to delete and recreate if needed
```

---

## Next Steps

1. ✅ **Local Development:** Run `./start-dev.sh`
2. ✅ **Test API:** Use curl examples above
3. ✅ **Implement PDF Processing:** Edit `/app/api/process/route.ts`
4. ✅ **Deploy to Lambda:** Run `./setup-lambda.sh`
5. ✅ **Monitor:** Check logs with `aws logs tail ...`

---

## Additional Resources

- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [AWS Lambda Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [API Gateway HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [AWS CLI Reference](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/index.html)
