#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

set -e

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Lambda Deployment Automation Setup     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI is not installed${NC}"
  echo "   Install from: https://aws.amazon.com/cli/"
  exit 1
fi

if ! command -v zip &> /dev/null; then
  echo -e "${RED}❌ zip is not installed${NC}"
  echo "   Install: brew install zip"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Get AWS account info
echo -e "${YELLOW}🔐 Verifying AWS credentials...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
REGION=${AWS_REGION:-us-east-1}
AWS_PROFILE=${AWS_PROFILE:-default}

if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}❌ Unable to get AWS account ID. Check your AWS credentials.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✅ Region: $REGION${NC}"
echo ""

# Step 1: Build the application
echo -e "${YELLOW}📦 Step 1: Building Next.js application...${NC}"
npm run build
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 2: Create .next handler wrapper for Lambda
echo -e "${YELLOW}📦 Step 2: Creating Lambda handler...${NC}"

cat > lambda-handler.js << 'EOF'
const { createServer } = require('http');
const { nextServer } = require('next');

let nextApp;
let server;
let isWarm = false;

exports.handler = async (event, context) => {
  // Reuse connection for warm starts
  if (!nextApp) {
    const dir = process.cwd();
    nextApp = nextServer({ dev: false, dir });
    server = createServer(nextApp.getRequestHandler());
  }

  isWarm = true;

  // Convert API Gateway event to Node.js request
  const path = event.rawPath || event.path || '/';
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const headers = event.headers || {};

  let body = event.body || '';
  if (event.isBase64Encoded) {
    body = Buffer.from(body, 'base64');
  }

  return new Promise((resolve, reject) => {
    const req = {
      method,
      url: path,
      headers,
      body,
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      write: function(chunk) {
        this.body += chunk;
      },
      end: function(chunk) {
        if (chunk) this.body += chunk;
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
          isBase64Encoded: false,
        });
      },
    };

    server.emit('request', req, res);
  });
};
EOF

echo -e "${GREEN}✅ Lambda handler created${NC}"
echo ""

# Step 3: Create deployment package
echo -e "${YELLOW}📦 Step 3: Creating deployment package...${NC}"

# Remove old zip if exists
rm -f coloring-book-lambda.zip

# Create temp directory for packaging
mkdir -p lambda-build
cd lambda-build

# Copy necessary files
cp -r ../.next .
cp ../lambda-handler.js .
cp ../package.json .
cp ../package-lock.json . 2>/dev/null || true

# Install production dependencies only
npm ci --production

# Create zip
zip -r ../coloring-book-lambda.zip . -q

cd ..
rm -rf lambda-build

PACKAGE_SIZE=$(du -h coloring-book-lambda.zip | cut -f1)
echo -e "${GREEN}✅ Deployment package created: $PACKAGE_SIZE${NC}"
echo ""

# Step 4: Create Lambda function (if doesn't exist)
echo -e "${YELLOW}🚀 Step 4: Setting up Lambda function...${NC}"

FUNCTION_NAME="coloring-book-grid-service"

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
  echo -e "${YELLOW}📝 Updating existing Lambda function...${NC}"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://coloring-book-lambda.zip \
    --region "$REGION" > /dev/null

  echo -e "${GREEN}✅ Lambda function updated${NC}"
else
  echo -e "${YELLOW}📝 Creating new Lambda function...${NC}"

  # Create IAM role for Lambda
  ROLE_NAME="coloring-book-lambda-role"

  if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "   Creating IAM role..."
    cat > trust-policy.json << 'TRUST'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
TRUST

    ROLE_ARN=$(aws iam create-role \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document file://trust-policy.json \
      --query 'Role.Arn' \
      --output text)

    rm trust-policy.json

    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole > /dev/null

    # Wait for role to propagate
    sleep 5
  else
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
  fi

  # Create Lambda function
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs18.x \
    --role "$ROLE_ARN" \
    --handler lambda-handler.handler \
    --zip-file fileb://coloring-book-lambda.zip \
    --timeout 60 \
    --memory-size 512 \
    --region "$REGION" > /dev/null

  echo -e "${GREEN}✅ Lambda function created${NC}"
fi
echo ""

# Step 5: Create/update API Gateway
echo -e "${YELLOW}🌐 Step 5: Setting up API Gateway...${NC}"

API_NAME="coloring-book-api"
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text --region "$REGION" 2>/dev/null)

if [ -z "$API_ID" ]; then
  echo "   Creating new API..."
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --target "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME" \
    --query 'ApiId' \
    --output text \
    --region "$REGION")

  echo -e "${GREEN}✅ API Gateway created: $API_ID${NC}"
else
  echo -e "${GREEN}✅ API Gateway already exists: $API_ID${NC}"
fi

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-apis --query "Items[?ApiId=='$API_ID'].ApiEndpoint" --output text --region "$REGION")

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          🎉 Setup Complete! 🎉             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Lambda Function:${NC} $FUNCTION_NAME"
echo -e "${GREEN}API Endpoint:${NC} $API_ENDPOINT"
echo -e "${GREEN}Region:${NC} $REGION"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1️⃣  Test the API endpoint:"
echo -e "   ${GREEN}curl -X POST $API_ENDPOINT/api/process \\${NC}"
echo -e "   ${GREEN}   -F 'gridLayout=2x2' \\${NC}"
echo -e "   ${GREEN}   -F 'url=https://example.com'${NC}"
echo ""
echo "2️⃣  Monitor Lambda logs:"
echo -e "   ${GREEN}aws logs tail /aws/lambda/$FUNCTION_NAME --follow${NC}"
echo ""
echo "3️⃣  Update Lambda if code changes:"
echo -e "   ${GREEN}./setup-lambda.sh${NC}"
echo ""
echo "4️⃣  To delete everything:"
echo -e "   ${GREEN}aws lambda delete-function --function-name $FUNCTION_NAME${NC}"
echo -e "   ${GREEN}aws apigatewayv2 delete-api --api-id $API_ID${NC}"
echo ""
