import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'
import path from 'path'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
})

const BUCKET_NAME = process.env.S3_BUCKET || 'coloring-book-pdfs'
const IS_DEV = process.env.NODE_ENV !== 'production'
const DEV_STORAGE_DIR = process.env.DEV_STORAGE_DIR || '/tmp/coloring-book-storage'

export async function uploadToS3(
  filePath: string
): Promise<{ downloadUrl: string; filename: string }> {
  const fileName = path.basename(filePath)
  const timestamp = Date.now()
  let result: { downloadUrl: string; filename: string } | null = null

  try {
    // In development, use local file storage
    if (IS_DEV && process.env.USE_LOCAL_STORAGE === 'true') {
      result = await uploadToLocalStorage(filePath, fileName, timestamp)
      return result
    }

    const fileContent = fs.readFileSync(filePath)
    const s3Key = `pdfs/${timestamp}/${fileName}`

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

    result = {
      downloadUrl,
      filename: fileName,
    }
    return result
  } catch (error) {
    // Fallback to local storage on S3 error in development
    if (IS_DEV) {
      console.warn(
        '⚠️  S3 upload failed, falling back to local storage:',
        error instanceof Error ? error.message : 'Unknown error'
      )
      result = await uploadToLocalStorage(filePath, fileName, timestamp)
      return result
    }

    throw new Error(
      `Failed to upload PDF to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    // Clean up local file (only after all operations complete)
    if (result) {
      try {
        fs.unlinkSync(filePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

async function uploadToLocalStorage(
  filePath: string,
  fileName: string,
  timestamp: number
): Promise<{ downloadUrl: string; filename: string }> {
  // Create local storage directory
  const storageDir = path.join(DEV_STORAGE_DIR, `${timestamp}`)
  await fs.promises.mkdir(storageDir, { recursive: true })

  // Copy file to storage
  const storagePath = path.join(storageDir, fileName)
  await fs.promises.copyFile(filePath, storagePath)

  // Generate local file URL (only works in development)
  // In production, this would be replaced with actual S3 URL
  const downloadUrl = `/api/download/${timestamp}/${fileName}`

  return {
    downloadUrl,
    filename: fileName,
  }
}
