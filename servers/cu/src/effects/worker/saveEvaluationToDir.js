import path from 'path'
import fs from 'fs'
import { omit } from 'ramda'
export function saveEvaluationToDirWith ({ EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET }) {
  return async ({ messageId, processId, output }) => {
    if (!EVALUATION_RESULT_DIR || !EVALUATION_RESULT_BUCKET) {
      console.log('EVALUATION_RESULT_DIR or EVALUATION_RESULT_BUCKET is not set')
      return 'not set'
    }
    const dir = path.join(EVALUATION_RESULT_DIR, `${processId}-${messageId}`)
    const outputWithoutMemory = omit(['Memory'], output)

    if (!fs.existsSync(dir)) {
      console.log('SAVING EVALUATION TO DIR', { EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET, messageId })
      try {
        fs.writeFileSync(dir, JSON.stringify(outputWithoutMemory))
      } catch (e) {
        console.error('Error writing file', e)
      }
    } else {
      console.log(`File ${dir} already exists, skipping`)
    }
    return output
  }
}
