import path from 'path'
import fs from 'fs'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
export function loadEvaluationWith ({ EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION }) {
  return async ({ messageId, processId }) => {
    console.log('LOADING EVALUATION', { messageId, processId })
    if (!EVALUATION_RESULT_DIR || !EVALUATION_RESULT_BUCKET) {
      return 'not set'
    }
    const loadEvaluationFromDir = loadEvaluationFromDirWith({ EVALUATION_RESULT_DIR })
    const loadEvaluationFromS3 = loadEvaluationFromS3With({ EVALUATION_RESULT_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION })
    const fileName = path.join(EVALUATION_RESULT_DIR, `${processId}-${messageId}.json`)
    const fileExists = fs.existsSync(fileName)

    if (fileExists) {
      return loadEvaluationFromDir({ fileName })
    } else {
      return loadEvaluationFromS3({ fileName }).then((file) => {
        fs.writeFileSync(fileName, JSON.stringify(file))
        return file
      })
    }
  }
}

function loadEvaluationFromDirWith ({ EVALUATION_RESULT_DIR }) {
  return ({ fileName }) => {
    try {
      const file = fs.readFileSync(fileName, 'utf8')
      return JSON.parse(file)
    } catch (e) {
      throw new Error(`Error reading file ${fileName}: ${e}`)
    }
  }
}

function loadEvaluationFromS3With ({ EVALUATION_RESULT_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION }) {
  return async ({ fileName }) => {
    const  s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    })
    const getFileFromS3 = (s3Client) => async (fileName) => {
      const key = fileName.split('/').pop()
      const command = new GetObjectCommand({
        Bucket: EVALUATION_RESULT_BUCKET,
        Key: key
      })
      const response = await s3Client.send(command)
      return response.Body.transformToString()
    }
    const file = await getFileFromS3(s3Client)(fileName)
      .then(JSON.parse)
      .catch((e) => {
        throw new Error(`Error getting file from S3: ${e}`)
      })
    console.log('file', { file })
    return file
  }
}

