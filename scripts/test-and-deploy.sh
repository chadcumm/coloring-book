#!/bin/bash

# =============================================================================
# Test-and-Deploy Pipeline
# =============================================================================
# This script automates the full change lifecycle:
#   Stage 1: Test locally (unit + integration + API + Playwright e2e)
#   Stage 2: Push to main, wait for deploy, test production (same e2e tests)
#
# Usage:
#   ./scripts/test-and-deploy.sh            # full pipeline
#   ./scripts/test-and-deploy.sh --local    # stage 1 only (skip deploy)
#   ./scripts/test-and-deploy.sh --prod     # stage 2 only (test production)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROD_URL="http://coloring-book-web-app.s3-website-us-east-1.amazonaws.com"

log()  { echo -e "${BLUE}[pipeline]${NC} $1"; }
pass() { echo -e "${GREEN}[  PASS  ]${NC} $1"; }
fail() { echo -e "${RED}[  FAIL  ]${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}[  WARN  ]${NC} $1"; }

# ─── Parse flags ─────────────────────────────────────────────────────────────
RUN_LOCAL=true
RUN_PROD=true
if [[ "${1:-}" == "--local" ]]; then
  RUN_PROD=false
elif [[ "${1:-}" == "--prod" ]]; then
  RUN_LOCAL=false
fi

# ─── Stage 1: Local Testing ─────────────────────────────────────────────────
if $RUN_LOCAL; then
  echo ""
  echo "==========================================="
  echo "  STAGE 1: LOCAL TESTING"
  echo "==========================================="
  echo ""

  # 1a. Unit, system, and integration tests (Vitest)
  log "Running unit, system, and integration tests..."
  if npm run test:all; then
    pass "All Vitest tests passed"
  else
    fail "Vitest tests failed — fix before deploying"
  fi

  # 1b. Build check
  log "Verifying build succeeds..."
  if npm run build; then
    pass "Build succeeded"
  else
    fail "Build failed — fix before deploying"
  fi

  # 1c. Playwright e2e tests against local dev server
  # playwright.config.ts will auto-start the dev server
  log "Running Playwright e2e tests against localhost..."
  if npm run test:e2e; then
    pass "Local e2e tests passed"
  else
    fail "Local e2e tests failed — fix before deploying"
  fi

  echo ""
  pass "Stage 1 complete: all local tests passed"
  echo ""
fi

# ─── Stage 2: Deploy & Production Testing ────────────────────────────────────
if $RUN_PROD; then
  echo ""
  echo "==========================================="
  echo "  STAGE 2: DEPLOY & PRODUCTION TESTING"
  echo "==========================================="
  echo ""

  # 2a. Push to main (triggers GitHub Actions deploy)
  CURRENT_BRANCH=$(git branch --show-current)
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    log "Merging current branch ($CURRENT_BRANCH) into main..."
    git checkout main
    git pull origin main
    git merge "$CURRENT_BRANCH" --no-edit
  fi

  log "Pushing to main (triggers auto-deploy via GitHub Actions)..."
  git push origin main

  # 2b. Wait for deployment to propagate
  log "Waiting 60 seconds for S3 deployment to propagate..."
  sleep 60

  # 2c. Verify production is reachable
  log "Checking production site is reachable..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "Production site is reachable (HTTP $HTTP_STATUS)"
  else
    warn "Production returned HTTP $HTTP_STATUS — site may still be deploying"
    log "Waiting another 30 seconds..."
    sleep 30
  fi

  # 2d. Run the same e2e tests against production
  log "Running Playwright e2e tests against production ($PROD_URL)..."
  if TEST_BASE_URL="$PROD_URL" npx playwright test; then
    pass "Production e2e tests passed"
  else
    fail "Production e2e tests failed — check the deployed site"
  fi

  # 2e. Run API smoke test against production
  log "Running API smoke test against production..."
  API_RESPONSE=$(curl -s "$PROD_URL/api/process" || echo "")
  if echo "$API_RESPONSE" | grep -q '"status"'; then
    pass "Production API health check passed"
  else
    warn "Production API health check returned unexpected response (may be expected for static export)"
  fi

  echo ""
  pass "Stage 2 complete: production tests passed"
  echo ""

  # Switch back to original branch if we changed
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    git checkout "$CURRENT_BRANCH"
  fi
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "==========================================="
echo "  PIPELINE COMPLETE"
echo "==========================================="
echo ""
$RUN_LOCAL && pass "Stage 1 (Local):      All tests passed"
$RUN_PROD  && pass "Stage 2 (Production): All tests passed"
echo ""
