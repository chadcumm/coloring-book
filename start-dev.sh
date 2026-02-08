#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Coloring Book Grid Service - Dev Server  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm install
  echo ""
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""
echo -e "${BLUE}🚀 Starting Next.js development server...${NC}"
echo ""
echo -e "${YELLOW}📍 The application will be available at:${NC}"
echo -e "${GREEN}   http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}📝 API endpoint for testing:${NC}"
echo -e "${GREEN}   POST http://localhost:3000/api/process${NC}"
echo ""
echo -e "${YELLOW}🧪 To test URL scraping feature:${NC}"
echo -e "${GREEN}   curl -X POST http://localhost:3000/api/process \\${NC}"
echo -e "${GREEN}     -F 'gridLayout=2x2' \\${NC}"
echo -e "${GREEN}     -F 'url=https://example.com'${NC}"
echo ""
echo -e "${YELLOW}📦 To test file upload:${NC}"
echo -e "${GREEN}   curl -X POST http://localhost:3000/api/process \\${NC}"
echo -e "${GREEN}     -F 'gridLayout=2x2' \\${NC}"
echo -e "${GREEN}     -F 'files=@/path/to/file.pdf'${NC}"
echo ""
echo -e "${YELLOW}⏸️  Press Ctrl+C to stop the server${NC}"
echo ""
echo "─────────────────────────────────────────────"
echo ""

npm run dev
