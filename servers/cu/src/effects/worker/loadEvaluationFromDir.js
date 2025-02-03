import path from 'path'
import fs from 'fs'
export function loadEvaluationFromDirWith ({ EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET }) {
  return async ({ messageId, processId, output }) => {
    console.log('LOADING EVALUATION FROM DIR', { EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET, messageId })
    if (!EVALUATION_RESULT_DIR || !EVALUATION_RESULT_BUCKET) {
      console.log('LOAD: EVALUATION_RESULT_DIR or EVALUATION_RESULT_BUCKET is not set')
      return 'not set'
    }
    const dir = path.join(EVALUATION_RESULT_DIR, `${processId}-${messageId}`)
    // const outputWithoutMemory = omit(['Memory'], output)

    if (!fs.existsSync(dir)) {
      console.log(`LOAD: File ${dir} does not exist`)
      return JSON.parse('{ "error": "not found" }')
    } else {
      console.log(`LOAD: File ${dir} exists`)
      try {
        const file = fs.readFileSync(dir, 'utf8')
        console.log('LOAD: File content', { file })
        return JSON.parse(file)
      } catch (e) {
        console.error('LOAD: Error reading file', e)
      }
    }
    return output
  }
}
