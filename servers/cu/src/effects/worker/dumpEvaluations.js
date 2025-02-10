import path from 'path'
import { S3Client } from '@aws-sdk/client-s3'

export function dumpEvaluationsWith ({ EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, uploadFileToS3With, globSync, logger }) {
  return async (processId) => {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
      return 'AWS Credentials not set'
    }
    const globPath = path.join(EVALUATION_RESULT_DIR, `${processId ?? ''}**.json`)
    const files = globSync(globPath)
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    })
    logger('Dumping evaluations to S3 Bucket: %s', EVALUATION_RESULT_BUCKET)
    const uploadFileToS3 = uploadFileToS3With(s3Client)
    for (const file of files) {
      const bucketName = EVALUATION_RESULT_BUCKET
      const key = file.split('/').pop()
      logger('Uploading file %s to S3 Bucket: %s', key, bucketName)
      try {
        await uploadFileToS3(file, bucketName, key)
        logger('Successfully uploaded file %s to S3 Bucket: %s', key, bucketName)
      } catch (e) {
        logger('Error uploading file %s to S3 Bucket: %s', key, bucketName)
        throw new Error(`Error uploading file ${key} to S3: ${e}`)
      }
    }
    logger('Successfully dumped evaluations to S3 Bucket: %s', EVALUATION_RESULT_BUCKET)
  }
}
