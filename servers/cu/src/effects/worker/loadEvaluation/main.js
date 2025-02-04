import { dumpEvaluationsWith } from '../dumpEvaluations.js'
import { loadEvaluationWith } from '../loadEvaluation.js'
export const createApis = async (ctx) => {
  const loadEvaluation = loadEvaluationWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET,
    AWS_ACCESS_KEY_ID: ctx.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: ctx.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: ctx.AWS_REGION
  })
  const dumpEvaluations = dumpEvaluationsWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET,
    AWS_ACCESS_KEY_ID: ctx.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: ctx.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: ctx.AWS_REGION
  })
  return { loadEvaluation, dumpEvaluations }
}
