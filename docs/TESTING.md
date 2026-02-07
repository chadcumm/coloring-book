# Testing Guide - Coloring Book Web Service

## Overview

This document describes the three-level testing approach for the Coloring Book Grid Service:

1. **MVP Tests** - Basic functionality validation (2-3 minutes)
2. **Comprehensive Tests** - All features with metrics and performance (10-15 minutes)
3. **CI/CD Tests** - Automated tests for GitHub Actions (2 minutes)

---

## Quick Start

### Prerequisites

- Node.js 18+
- `npm install` completed
- Development server ready

### Run Tests

```bash
# Start development server (required)
npm run dev

# In another terminal, run tests:
npm run test:mvp        # Quick MVP tests
npm run test:full       # All test levels
npm run test:ci         # CI/CD tests (headless)
npm run test:suite      # Build + Full tests (CI use)
```

---

## Test Levels Explained

### Level 1: MVP Tests

**Purpose**: Verify core functionality works

**What it tests**:
- ✅ Download PDFs from URL (Animal coloring pages)
- ✅ Download PDFs from URL (Valentine coloring pages)
- ✅ Error handling (invalid URLs)

**Test URLs**:
- https://greencoloring.com/animal-coloring-pages/
- https://greencoloring.com/valentines-day-coloring-pages/

**Output**: Pass/fail report with test results

**Runtime**: ~2-3 minutes

**Use when**: You want quick validation before deployment

```bash
npm run test:mvp
```

---

### Level 2: Comprehensive Tests

**Purpose**: Validate all features and measure performance

**What it tests**:
- ✅ All MVP tests
- ✅ Grid layout: 3x2 (6 per page)
- ✅ Grid layout: 2x3 (6 per page)
- ✅ Grid layout: 4x1 (4 per page)
- ✅ Grid layout: 2x2 (4 per page)
- ✅ Performance metrics (download time, merge time)
- ✅ Response structure validation

**Output**: Detailed JSON report with:
- Test execution times
- Response sizes
- Page counts
- Performance analysis

**Runtime**: ~10-15 minutes

**Use when**: You need detailed validation or are troubleshooting issues

```bash
npm run test:full
```

---

### Level 3: CI/CD Tests

**Purpose**: Fast automated validation for continuous integration

**What it tests**:
- ✅ API health check
- ✅ Process endpoint reachability
- ✅ Quick functional test (one layout)

**Output**: Machine-parseable JSON (suitable for GitHub Actions)

**Runtime**: ~2 minutes

**Use when**: Running in GitHub Actions or CI pipeline

```bash
npm run test:ci
```

---

## Test Reports

All test runs generate JSON reports in the `test-reports/` directory:

```
test-reports/
├── test-report-mvp-2026-02-07.json
├── test-report-comprehensive-2026-02-07.json
└── test-report-ci-2026-02-07.json
```

### Report Format

```json
{
  "timestamp": "2026-02-07T12:34:56.789Z",
  "level": "mvp",
  "environment": "development",
  "duration": 120000,
  "totalTests": 3,
  "passed": 3,
  "failed": 0,
  "results": [
    {
      "name": "Download from URL (Animal Pages)",
      "passed": true,
      "duration": 35000,
      "details": {
        "downloadUrl": "https://...",
        "filename": "coloring-grid.pdf",
        "pageCount": 8
      }
    }
  ]
}
```

---

## Understanding Test Results

### Passing Tests ✅

All tests passed and results were as expected:
- Download completed successfully
- PDFs merged correctly
- Response contained valid download URL
- No errors encountered

### Failing Tests ❌

One or more tests did not pass. Check:

1. **Service Running?** - Is `npm run dev` still running?
2. **Internet Connection?** - URL tests require downloading from websites
3. **Error Message** - Check the test output for specific failure reason
4. **Check Logs** - Look at server console for API errors

### Common Failures

| Failure | Cause | Solution |
|---------|-------|----------|
| "Service not reachable" | Dev server not running | Run `npm run dev` |
| "No download URL returned" | API error | Check server logs |
| "Network timeout" | Slow internet/website down | Check internet, retry |
| "Invalid URL error" | Malformed URL | Verify URL is correct |

---

## Running Tests in CI/CD (GitHub Actions)

The test suite is ready for GitHub Actions. Add to your workflow:

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run test:ci
```

---

## Interpreting Performance Metrics

### Download Time
- **Expected**: 5-30 seconds (depends on website & file count)
- **Normal**: 10-20 seconds for 5-10 PDFs
- **Slow**: > 30 seconds (check internet/website)

### Merge Time
- **Expected**: 1-5 seconds
- **Normal**: 2-3 seconds
- **Slow**: > 5 seconds (check PDF sizes)

### Total Time
- **MVP**: 2-3 minutes
- **Comprehensive**: 10-15 minutes
- **CI**: 1-2 minutes

---

## Test Maintenance

### Adding New Tests

Edit `tests/test-runner.ts` and add to appropriate test level:

```typescript
// In runMvpTests(), runComprehensiveTests(), or runCiTests()
await this.test('My new test', async () => {
  // Your test code here
  return { result: 'value' }
})
```

### Updating Test URLs

Modify in `DEFAULT_CONFIG`:

```typescript
const DEFAULT_CONFIG: TestConfig = {
  testUrls: [
    'https://new-url-1.com/pdfs/',
    'https://new-url-2.com/pdfs/',
  ],
  // ...
}
```

### Customizing Timeout

```bash
npm run test:mvp -- --timeout 60000  # 60 second timeout
```

---

## Troubleshooting

### Tests won't run

1. Ensure `npm install` completed
2. Check Node.js version: `node --version` (need 18+)
3. Start dev server: `npm run dev`
4. Try building first: `npm run build`

### Tests timeout

1. Check internet connection
2. Websites might be slow/down - try later
3. Increase timeout: Edit `DEFAULT_CONFIG.timeout` in `test-runner.ts`
4. Run smaller test level (MVP instead of Comprehensive)

### API errors in tests

1. Check `npm run dev` console for errors
2. Verify environment variables in `.env.local`
3. Check S3 bucket is accessible (if testing downloads)
4. Review server logs for detailed error messages

---

## Best Practices

✅ **Do**:
- Run MVP tests before pushing to main
- Run full tests before major releases
- Check reports for unexpected changes
- Keep test URLs up-to-date
- Run tests on different machines to verify consistency

❌ **Don't**:
- Run tests on production URLs (API calls will create real S3 files)
- Run tests on slow/metered internet
- Ignore test failures (investigate!)
- Leave test reports uncommitted (add to .gitignore)

---

## Example Test Run

```bash
$ npm run test:mvp

🧪 Starting MVP Tests
📍 Target: http://localhost:3000
⏱️  Timeout: 30000ms

✅ Download from URL (Animal Pages) (35000ms)
✅ Download from URL (Valentine Pages) (32000ms)
✅ Error Handling - Invalid URL (1200ms)

==================================================
📊 TEST SUMMARY
==================================================
Level: MVP
Total: 3 tests
✅ Passed: 3 | ❌ Failed: 0
⏱️  Duration: 68.20s
==================================================

📄 Report saved to: test-reports/test-report-mvp-2026-02-07.json
```

---

## Next Steps

1. **Run MVP tests locally**: `npm run test:mvp`
2. **Review reports**: Check `test-reports/` directory
3. **Add to CI**: Update GitHub Actions workflow
4. **Monitor**: Add tests to pre-commit hooks

---

**Last Updated**: 2026-02-07
**Status**: Ready for use
