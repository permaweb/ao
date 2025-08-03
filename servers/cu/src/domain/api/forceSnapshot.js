import { of, fromPromise } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  processId: z.string()
})

export function forceSnapshotWith ({ writeFileCheckpointMemory, writeFileCheckpointRecord, cache, logger }) {
  writeFileCheckpointMemory = fromPromise(writeFileCheckpointMemory)
  writeFileCheckpointRecord = fromPromise(writeFileCheckpointRecord)

  return (input) => {
    return of(input)
      .map(inputSchema.parse)
      .chain(({ processId }) => {
        logger('Manually forcing snapshot for process %s', processId)

        const latestMemory = cache.get(processId)

        return of(latestMemory)
          .chain((latestMemory) => {
            if (!latestMemory || !latestMemory.Memory) {
              return of({
                success: false,
                message: `No cached memory found for process ${processId}`
              })
            }

            logger('Found cached memory for process %s, saving file checkpoint...', processId)

            return of({ Memory: latestMemory.Memory, evaluation: latestMemory.evaluation })
              .chain(writeFileCheckpointMemory)
              .chain((file) =>
                writeFileCheckpointRecord(latestMemory.evaluation, file)
                  .map(() => file)
              )
              .map((file) => ({
                success: true,
                message: `File snapshot forced for process ${processId}`,
                processId,
                file,
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
