import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

// Create S3 bucket for temporary PDFs
const bucket = new aws.s3.Bucket('coloring-book-pdfs', {
  acl: 'private',
  corsRules: [
    {
      allowedHeaders: ['*'],
      allowedMethods: ['GET', 'PUT', 'POST'],
      allowedOrigins: ['*'],
      exposeHeaders: ['ETag'],
      maxAgeSeconds: 3000,
    },
  ],
})

// Add lifecycle policy to auto-delete files after 1 hour
new aws.s3.BucketLifecycleConfigurationV2(
  'coloring-book-lifecycle',
  {
    bucket: bucket.id,
    rules: [
      {
        id: 'delete-old-pdfs',
        status: 'Enabled',
        expiration: {
          days: 1, // Delete after 1 day (more practical than 1 hour for clock-skew)
        },
        prefix: 'pdfs/',
      },
    ],
  }
)

// Create IAM role for Lambda
const lambdaRole = new aws.iam.Role('coloring-book-lambda-role', {
  assumeRolePolicy: aws.iam.getPolicyDocument({
    version: '2012-10-17',
    statements: [
      {
        actions: ['sts:AssumeRole'],
        effect: 'Allow',
        principals: [{
          type: 'Service',
          identifiers: ['lambda.amazonaws.com'],
        }],
      },
    ],
  }).then((r) => r.json),
})

// Attach basic Lambda execution policy
new aws.iam.RolePolicyAttachment('lambda-basic-execution', {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
})

// Create S3 access policy for Lambda
new aws.iam.RolePolicy('lambda-s3-access', {
  role: lambdaRole.id,
  policy: pulumi.all([bucket.arn]).apply(([arn]) =>
    aws.iam.getPolicyDocument({
      version: '2012-10-17',
      statements: [
        {
          actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
          effect: 'Allow',
          resources: [`${arn}/*`],
        },
      ],
    }).then((p) => p.json)
  ),
})

// Create API Gateway
const api = new awsx.apigateway.API('coloring-book-api', {
  stageName: 'dev',
  routes: [
    {
      path: '/',
      method: 'GET',
      eventHandler: new aws.lambda.CallbackFunction(
        'root-handler',
        {
          runtime: 'nodejs18.x',
          role: lambdaRole,
          handler: async (event) => {
            return {
              statusCode: 200,
              body: JSON.stringify({ message: 'Coloring Book Grid Service' }),
            }
          },
        },
        { options: { asyncInvoke: true } }
      ),
    },
  ],
})

// Export outputs
export const apiEndpoint = api.url
export const bucketName = bucket.id
export const bucketArn = bucket.arn
