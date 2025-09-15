import { cacheProcessMemoryWith } from '../lib/cacheProcessMemory.js'

export function readStateFromCheckpointWith (env) {
  const cacheProcessMemory = cacheProcessMemoryWith(env)

  return ({ processId, moduleId, assignmentId, hashChain, timestamp, epoch, nonce, blockHeight, ordinate, body }) => {
    return cacheProcessMemory({
      processId,
      moduleId,
      assignmentId,
      hashChain,
      timestamp,
      epoch,
      nonce,
      blockHeight,
      ordinate,
      cron: false,
      Memory: body
    })
  }
}
