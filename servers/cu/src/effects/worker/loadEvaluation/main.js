import { dumpEvaluationsWith } from '../dumpEvaluations.js'
import { loadEvaluationFromDirWith, loadEvaluationFromS3With, loadEvaluationWith } from '../loadEvaluation.js'
import fs from 'node:fs'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

export const createApis = async (ctx) => {
  const uploadFileToS3With = (s3Client) => {
    return async (filePath, bucketName, key) => {
        const fileStream = fs.createReadStream(filePath);
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileStream
        };
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
    }
  }

  const getFileFromS3With = (EVALUATION_RESULT_BUCKET, s3Client) => {
    return async (fileName) => {
      const key = fileName.split('/').pop()
      const command = new GetObjectCommand({
        Bucket: EVALUATION_RESULT_BUCKET,
        Key: key
      })
      const response = await s3Client.send(command)
      return response.Body.transformToString()
    }
  }

  const loadEvaluation = loadEvaluationWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    AWS_ACCESS_KEY_ID: ctx.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: ctx.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: ctx.AWS_REGION,
    logger: ctx.logger,
    existsSync: fs.existsSync,
    writeFileSync: fs.writeFileSync,
    loadEvaluationFromDir: loadEvaluationFromDirWith({ 
      logger: ctx.logger,
      readFileSync: fs.readFileSync 
    }),
    loadEvaluationFromS3: loadEvaluationFromS3With({ 
      EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET,
      AWS_ACCESS_KEY_ID: ctx.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: ctx.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: ctx.AWS_REGION,
      logger: ctx.logger,
      getFileFromS3With: getFileFromS3With
    })
  })
  const dumpEvaluations = dumpEvaluationsWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET,
    AWS_ACCESS_KEY_ID: ctx.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: ctx.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: ctx.AWS_REGION,
    globSync: ctx.globSync,
    logger: ctx.logger,
    uploadFileToS3With
  })
  return { loadEvaluation, dumpEvaluations }
}
