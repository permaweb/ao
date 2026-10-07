import { Rejected, Resolved, fromPromise, of } from 'hyper-async'

import { findLatestProcessMemorySchema, isProcessOwnerSupportedSchema, loadTransactionMetaSchema } from '../dal.js'
import { addressFrom, eqOrIncludes, parseTags } from '../utils.js'

const noArweaveCheckpoint = (processId) => ({
  status: 400,
  message: `No trusted Arweave checkpoint is available for process "${processId}"`
})

/**
 * Load a process strictly from its latest trusted Arweave checkpoint.
 *
 * Process metadata also comes directly from Arweave. This path deliberately
 * has no scheduler dependencies and performs no message or cron catch-up.
 */
export function loadArweaveProcessStateWith ({
  findLatestProcessMemory,
  loadTransactionMeta,
  isProcessOwnerSupported
}) {
  findLatestProcessMemory = fromPromise(findLatestProcessMemorySchema.implement(findLatestProcessMemory))
  loadTransactionMeta = fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta))
  isProcessOwnerSupported = fromPromise(isProcessOwnerSupportedSchema.implement(isProcessOwnerSupported))

  function loadCheckpoint (processId) {
    return findLatestProcessMemory({ processId, arweaveOnly: true })
      .bimap(
        (err) => err?.processId === processId && err?.arweaveOnly
          ? noArweaveCheckpoint(processId)
          : err,
        (checkpoint) => checkpoint
      )
      .chain((checkpoint) => checkpoint?.src === 'arweave' && checkpoint.Memory != null
        ? Resolved(checkpoint)
        : Rejected(noArweaveCheckpoint(processId))
      )
  }

  function loadProcessMeta (processId) {
    return loadTransactionMeta(processId)
      .chain((meta) => {
        const tags = parseTags(meta.tags)
        if (!eqOrIncludes('ao')(tags['Data-Protocol'])) {
          return Rejected({ status: 422, message: `Transaction "${processId}" is not an ao process` })
        }
        if (!eqOrIncludes('Process')(tags.Type)) {
          return Rejected({ status: 422, message: `Transaction "${processId}" is not a process` })
        }
        if (!tags.Module) {
          return Rejected({ status: 422, message: `Process "${processId}" has no Module tag` })
        }

        const owner = addressFrom(meta.owner)
        return isProcessOwnerSupported(owner)
          .chain((isSupported) => isSupported
            ? Resolved({ owner, tags: meta.tags })
            : Rejected({ status: 403, message: `Access denied for process owner ${owner}` })
          )
      })
  }

  return ({ processId }) => of(processId)
    .chain(loadCheckpoint)
    .chain((checkpoint) => loadProcessMeta(processId)
      .map((process) => ({
        id: processId,
        owner: process.owner,
        tags: process.tags,
        checkpoint,
        Memory: checkpoint.Memory,
        result: { Memory: checkpoint.Memory },
        from: checkpoint.timestamp,
        ordinate: checkpoint.ordinate,
        fromBlockHeight: checkpoint.blockHeight,
        fromCron: checkpoint.cron,
        mostRecentAssignmentId: checkpoint.assignmentId,
        mostRecentHashChain: checkpoint.hashChain
      }))
    )
}
