import path from 'path'
import { omit } from 'ramda'
export function saveEvaluationToDirWith ({ EVALUATION_RESULT_DIR, existsSync, writeFileSync, logger }) {
  return async ({ messageId, processId, output }) => {
    const dir = path.join(EVALUATION_RESULT_DIR, `${processId}-${messageId}.json`)
    const outputWithoutMemory = omit(['Memory'], output)

    logger('Saving evaluation of message %s to process %s to directory: %s', messageId, processId, dir)
    if (!existsSync(dir)) {
      try {
        writeFileSync(dir, JSON.stringify(outputWithoutMemory))
      } catch (e) {
        throw new Error(`Error writing file ${dir}: ${e}`)
      }
      logger('Successfully saved evaluation of message %s to process %s to directory: %s', messageId, processId, dir)
    } else {
      logger('Evaluation of message %s to process %s already exists in directory: %s', messageId, processId, dir)
    }
    return output
  }
}
