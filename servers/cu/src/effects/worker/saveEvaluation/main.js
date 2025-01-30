import { saveEvaluationToDirWith } from '../saveEvaluationToDir.js'
export const createApis = async (ctx) => {
  const saveEvaluationToDir = saveEvaluationToDirWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET
  })
  return { saveEvaluationToDir }
}
