import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'
import path from 'path'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
})

const BUCKET_NAME = process.env.S3_BUCKET || 'coloring-book-pdfs'

export async function uploadToS3(
  filePath: string
): Promise<{ downloadUrl: string; filename: string }> {
  const fileContent = fs.readFileSync(filePath)
  const fileName = path.basename(filePath)
  const timestamp = Date.now()
  const s3Key = `pdfs/${timestamp}/${fileName}`

  try {
    // Upload file to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/pdf',
    })

    await s3Client.send(uploadCommand)

    // Generate signed URL valid for 1 hour
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600, // 1 hour
    })

    return {
      downloadUrl,
      filename: fileName,
    }
  } catch (error) {
    throw new Error(
      `Failed to upload PDF to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    // Clean up local file
    try {
      fs.unlinkSync(filePath)
    } catch {
      // Ignore cleanup errors
    }
  }
}
