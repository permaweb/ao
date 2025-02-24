import { saveEvaluationToDirWith } from '../saveEvaluationToDir.js'
import fs from 'node:fs'
export const createApis = async (ctx) => {
  const saveEvaluationToDir = saveEvaluationToDirWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    existsSync: fs.existsSync,
    writeFileSync: fs.writeFileSync,
    logger: ctx.logger
  })
  return { saveEvaluationToDir }
}
