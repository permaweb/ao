import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  processId: z.string()
})

export function forceSnapshotWith ({ saveCheckpoint, findLatestProcessMemory, logger }) {
  return (input) => {
    return of(input)
      .map(inputSchema.parse)
      .chain(({ processId }) => {
        logger('Manually forcing snapshot for process %s', processId)

        return of(processId)
          .chain(findLatestProcessMemory)
          .chain((latestMemory) => {
            if (!latestMemory) {
              return of({
                success: false,
                message: `No cached memory found for process ${processId}`
              })
            }

            logger('Found cached memory for process %s, saving snapshot...', processId)

            return saveCheckpoint({
              Memory: latestMemory.Memory,
              evaluation: latestMemory.evaluation
            })
              .map(() => ({
                success: true,
                message: `Snapshot forced for process ${processId}`,
                processId,
                timestamp: latestMemory.evaluation.timestamp,
                ordinate: latestMemory.evaluation.ordinate,
                // Include all critical sync information
                snapshot: {
                  processId: latestMemory.evaluation.processId,
                  moduleId: latestMemory.evaluation.moduleId,
                  messageId: latestMemory.evaluation.messageId,
                  assignmentId: latestMemory.evaluation.assignmentId,
                  hashChain: latestMemory.evaluation.hashChain,
                  timestamp: latestMemory.evaluation.timestamp,
                  epoch: latestMemory.evaluation.epoch,
                  nonce: latestMemory.evaluation.nonce,
                  blockHeight: latestMemory.evaluation.blockHeight,
                  ordinate: latestMemory.evaluation.ordinate,
                  encoding: latestMemory.evaluation.encoding,
                  cron: latestMemory.evaluation.cron,
                  // Include memory info if available
                  memoryId: latestMemory.Memory?.id,
                  memoryEncoding: latestMemory.Memory?.encoding
                }
              }))
              .bimap(
                (error) => {
                  logger('Error saving snapshot for process %s: %O', processId, error)
                  return {
                    success: false,
                    message: `Failed to save snapshot: ${error.message || error}`
                  }
                },
                (result) => result
              )
          })
      })
      .toPromise()
  }
}
