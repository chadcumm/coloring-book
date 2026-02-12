# Testing Guide - Coloring Book Web Service

## Overview

Every change follows a **two-stage testing pipeline** before it is considered verified:

1. **Stage 1 (Local)** - Run all tests against a locally deployed server
2. **Stage 2 (Production)** - Deploy to main, then run the same tests against the live site

Both stages include API command-line tests **and** browser-based UI tests via Playwright. This ensures nothing ships without being verified end-to-end in both environments.

---

## Quick Start

```bash
# Full pipeline: test locally, deploy, test production
./scripts/test-and-deploy.sh

# Stage 1 only (local testing)
./scripts/test-and-deploy.sh --local

# Stage 2 only (production testing)
./scripts/test-and-deploy.sh --prod
```

Or run individual test commands:

```bash
npm run test:all       # Vitest unit + system + integration
npm run test:e2e       # Playwright e2e against localhost
npm run test:e2e:prod  # Playwright e2e against production
npm run test:local     # All Vitest + all Playwright (local)
npm run test:deploy    # Full local tests + production e2e
```

---

## Two-Stage Pipeline

### Stage 1: Local Testing

Runs against `http://localhost:3000`. The Playwright config auto-starts the dev server.

| Step | Command | What it tests |
|------|---------|---------------|
| 1a | `npm run test:all` | Unit, system, and integration tests (Vitest, 279 tests) |
| 1b | `npm run build` | Verifies the Next.js build succeeds |
| 1c | `npm run test:e2e` | Playwright browser tests against local dev server |

**Stage 1 tests include:**

- **API tests (command line):** Health endpoint, process endpoint, error handling, form validation
- **UI tests (Playwright browser):** Page loads, tab navigation, grid selector interaction, form validation, URL submission flow

If any step fails, the pipeline stops. Fix the issue before proceeding.

### Stage 2: Production Testing

Runs after deploying to `http://coloring-book-web-app.s3-website-us-east-1.amazonaws.com`.

| Step | What happens |
|------|-------------|
| 2a | Push to `main` branch (triggers GitHub Actions auto-deploy to S3) |
| 2b | Wait for deployment to propagate |
| 2c | Verify production site returns HTTP 200 |
| 2d | Run the **same** Playwright e2e tests against the production URL |
| 2e | Run API smoke test against production |

The same test files run in both stages -- only the `TEST_BASE_URL` environment variable changes.

---

## How It Runs Automatically

### On Every Push to Main (GitHub Actions)

The `.github/workflows/deploy.yml` workflow runs three jobs:

```
test (Stage 1)  -->  deploy (Stage 2)  -->  verify (Stage 3)
  Vitest + e2e        Build & push to S3     e2e against prod
```

- **test**: Runs all Vitest tests, builds, installs Playwright, runs e2e
- **deploy**: Only runs if `test` passes; deploys to S3
- **verify**: Only runs if `deploy` succeeds; runs Playwright against the live URL

### On Pull Requests

The `test` job runs on every PR to `main`, so broken code cannot be merged.

### Locally (Manual)

Run `./scripts/test-and-deploy.sh` which performs the full two-stage pipeline from your machine:

1. Runs all Vitest tests
2. Builds the project
3. Runs Playwright e2e against localhost
4. Merges to main and pushes
5. Waits for deployment
6. Runs Playwright e2e against production

---

## Test Inventory

### Vitest Tests (279 tests, 19 files)

| Category | Files | Tests | What it covers |
|----------|-------|-------|----------------|
| Unit | 6 | 119 | API endpoints, grid calculations, PDF processing |
| System | 3 | 33 | Upload, URL scraping, and grid generation workflows |
| Integration | 3 | 45 | Complete workflows, error handling, performance |
| Adapter | 7 | 82 | Adapter discovery, strategies, e2e adapter system |

```bash
npm run test:unit          # Unit tests only
npm run test:system        # System tests only
npm run test:integration   # Integration tests only
npm run test:all           # All of the above
npm run test:coverage      # With coverage report
npm run test:watch         # Watch mode during development
```

### Playwright E2E Tests (2 files)

| File | Tests | What it covers |
|------|-------|----------------|
| `tests/e2e/app.spec.ts` | 9 | Page rendering, tab navigation, grid selector, form validation, URL submission |
| `tests/e2e/api.spec.ts` | 4 | API health check, process endpoint, error responses |

```bash
npm run test:e2e           # Run against localhost (auto-starts dev server)
npm run test:e2e:prod      # Run against production S3 URL
npm run test:e2e:ci        # Run in CI mode (JSON reporter, no server reuse)
```

---

## Test Configuration

### Vitest (`vitest.config.ts`)

- Environment: Node.js
- Test timeout: 30 seconds
- Coverage: v8 provider with text, JSON, and HTML reporters

### Playwright (`playwright.config.ts`)

- Browser: Chromium
- Base URL: `TEST_BASE_URL` env var or `http://localhost:3000`
- Auto-starts dev server when testing against localhost
- CI mode: JSON + HTML reporters, no server reuse, 2 retries
- Screenshots on failure, trace on first retry

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `TEST_BASE_URL` | `http://localhost:3000` | Target URL for Playwright tests |
| `CI` | (unset) | Set to `true` to enable CI-mode reporters and retries |

---

## Test Reports

All test runs generate reports:

```
test-reports/
├── e2e-results.json          # Playwright JSON results (CI)
├── test-report-mvp-*.json    # MVP test runner reports
└── test-report-*.json        # Comprehensive test reports

playwright-report/            # Playwright HTML report
test-results/                 # Playwright traces and screenshots
```

---

## Adding New Tests

### Adding a Vitest Test

Add files to the appropriate directory under `tests/`:

```
tests/unit/       - Fast, isolated tests for individual modules
tests/system/     - Tests for complete subsystem workflows
tests/integration/ - Tests that span multiple subsystems
```

### Adding a Playwright E2E Test

Add `.spec.ts` files under `tests/e2e/`. They automatically run in both local and production stages.

```typescript
import { test, expect } from '@playwright/test'

test('my new feature works', async ({ page }) => {
  await page.goto('/')
  // interact with the UI
  await expect(page.locator('text=Expected')).toBeVisible()
})
```

Tests added here will run against both localhost and the production URL with no changes needed.

---

## Troubleshooting

### Playwright tests fail locally

1. Install browsers: `npx playwright install --with-deps chromium`
2. Check that port 3000 is free (Playwright auto-starts the dev server)
3. Run `npm run dev` manually and check for startup errors

### Playwright tests fail in CI

1. Check the GitHub Actions log for the `test` job
2. Download the `test-results` artifact for screenshots and traces
3. Open the Playwright HTML report: `npx playwright show-report`

### Production e2e tests fail

1. Verify the site is reachable: `curl -I http://coloring-book-web-app.s3-website-us-east-1.amazonaws.com`
2. Check the `deploy` job completed successfully in GitHub Actions
3. Download the `production-test-results` artifact for details
4. The S3 static export may not support API routes -- some API tests may need to be skipped in production

### Vitest tests fail

1. Ensure `npm install` completed
2. Check Node.js version: `node --version` (need 18+)
3. Run `npm run test:unit` first to isolate the failure

---

## Workflow Summary

```
Developer makes a change
         |
         v
   ┌─────────────────────┐
   │   STAGE 1: LOCAL     │
   │                      │
   │  1. Vitest tests     │
   │  2. Build check      │
   │  3. Playwright e2e   │
   │     - API tests      │
   │     - UI browser     │
   └──────────┬───────────┘
              │ all pass
              v
   ┌─────────────────────┐
   │   STAGE 2: DEPLOY   │
   │                      │
   │  1. Push to main     │
   │  2. GitHub Actions   │
   │     auto-deploys     │
   │  3. Wait for S3      │
   └──────────┬───────────┘
              │ deployed
              v
   ┌─────────────────────┐
   │   STAGE 3: VERIFY   │
   │                      │
   │  1. Playwright e2e   │
   │     against prod     │
   │     - API tests      │
   │     - UI browser     │
   │  2. Smoke test       │
   └──────────┬───────────┘
              │ all pass
              v
        Change verified
```

---

**Last Updated**: 2026-02-08
**Status**: Active - two-stage pipeline operational
