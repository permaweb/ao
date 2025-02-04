import path from 'path'
import fs from 'fs'
import { omit } from 'ramda'
export function saveEvaluationToDirWith ({ EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET }) {
  return async ({ messageId, processId, output }) => {
    if (!EVALUATION_RESULT_DIR || !EVALUATION_RESULT_BUCKET) {
      return 'not set'
    }
    const dir = path.join(EVALUATION_RESULT_DIR, `${processId}-${messageId}.json`)
    const outputWithoutMemory = omit(['Memory'], output)

    if (!fs.existsSync(dir)) {
      try {
        fs.writeFileSync(dir, JSON.stringify(outputWithoutMemory))
      } catch (e) {
        throw new Error(`Error writing file ${dir}: ${e}`)
      }
    }
    return output
  }
}
