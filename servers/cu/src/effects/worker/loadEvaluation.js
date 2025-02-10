import path from 'path'
import fs from 'fs'
import { S3Client } from '@aws-sdk/client-s3'
export function loadEvaluationWith ({ EVALUATION_RESULT_DIR, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, logger, existsSync, writeFileSync, loadEvaluationFromDir, loadEvaluationFromS3 }) {
  return async ({ messageId, processId }) => {
    logger('Attempting to load evaluation from directory: %s', EVALUATION_RESULT_DIR)
    const fileName = path.join(EVALUATION_RESULT_DIR, `${processId}-${messageId}.json`)
    const fileExists = existsSync(fileName)

    if (fileExists) {
      return loadEvaluationFromDir({ fileName })
    } else {
      if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
        return 'AWS Credentials not set'
      }
      return loadEvaluationFromS3({ fileName }).then((file) => {
        writeFileSync(fileName, JSON.stringify(file))
        return file
      })
    }
  }
}

export function loadEvaluationFromDirWith ({ logger, readFileSync }) {
  return ({ fileName }) => {
    try {
      const file = readFileSync(fileName, 'utf8')
      logger('Successfully loaded evaluation from directory: %s', fileName)
      return JSON.parse(file)
    } catch (e) {
      logger('Error reading file %s: %s', fileName, e)
      throw new Error(`Error reading file ${fileName}: ${e}`)
    }
  }
}

export function loadEvaluationFromS3With ({ EVALUATION_RESULT_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, logger, getFileFromS3With }) {
  return async ({ fileName }) => {
    const  s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    })
    logger('Attempting to load evaluation from S3: %s', fileName)
    const getFileFromS3 = getFileFromS3With(EVALUATION_RESULT_BUCKET, s3Client)
    const file = await getFileFromS3(fileName)
      .then(JSON.parse)
      .catch((e) => {
        throw new Error(`Error getting file from S3: ${e}`)
      })
    logger('Successfully loaded evaluation from S3: %s', fileName)
    return file
  }
}

