import { loadEvaluationFromDirWith } from '../loadEvaluationFromDir.js'
export const createApis = async (ctx) => {
  const loadEvaluationFromDir = loadEvaluationFromDirWith({
    EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
    EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET
  })
  const dumpEvaluations = () => {
    console.log('DUMPING EVALUATIONS IN WORKER')
  }
  return { loadEvaluationFromDir, dumpEvaluations }
}
