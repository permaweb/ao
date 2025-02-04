import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'

export function dumpEvaluationsWith ({ EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION }) {
  return async (processId) => {
    if (!EVALUATION_RESULT_DIR || !EVALUATION_RESULT_BUCKET) {
        return 'not set: dir'
    }
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
        return 'not set: aws'
    }
    const globPath = path.join(EVALUATION_RESULT_DIR, `${processId ?? ``}**.json`)
    const files = fs.globSync(globPath)
    const uploadFileToS3With = (s3Client) => {
        return async (filePath, bucketName, key) => {
            const fileStream = fs.createReadStream(filePath);
            const params = {
                Bucket: bucketName,
                Key: key,
                Body: fileStream
            };
            const command = new PutObjectCommand(params);
            // TODO: uncomment this
            // await s3Client.send(command);
        }
    }
    const  s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    })
    const uploadFileToS3 = uploadFileToS3With(s3Client)
    for (const file of files) {
      const bucketName = EVALUATION_RESULT_BUCKET
      const key = file.split('/').pop()
      try {
        await uploadFileToS3(file, bucketName, key)
      } catch (e) {
        throw new Error(`Error uploading file ${key} to S3: ${e}`)
      }
    }
  }
}
