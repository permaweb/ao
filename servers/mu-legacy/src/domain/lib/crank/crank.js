import { of, fromPromise } from 'hyper-async'

function crankListWith ({ processMsg, processSpawn, logger }) {
  function asyncTrampoline (fn) {
    return async function (...args) {
      let result = fn(...args)

      while (result && result instanceof Promise) {
        const resolved = await result
        if (typeof resolved === 'function') {
          result = resolved()
        } else {
          result = null
        }
      }

      return result
    }
  }

  const processMsgsTrampolined = asyncTrampoline(async function processMessages (ctx) {
    if (!ctx.msgs || ctx.msgs.length === 0) {
      // Process spawns when the recursion terminates
      if (ctx.spawns && ctx.spawns.length > 0) {
        for (const spawn of ctx.spawns) {
          await of({ cachedSpawn: spawn })
            .chain(processSpawn)
            .toPromise()
        }
      }

      return ctx
    }

    const [head, ...tail] = ctx.msgs

    const newCtx = await of(head).chain(() => processMsg({ cachedMsg: head })).toPromise()

    const combinedMsgs = [...(newCtx.msgs || []), ...tail]

    // accumulate spawns for processing at the end
    const combinedSpawns = [...(newCtx.spawns || []), ...(ctx.spawns || [])]

    return async function nextIteration () {
      return processMessages({ ...ctx, ...newCtx, msgs: combinedMsgs, spawns: combinedSpawns })
    }
  })

  return processMsgsTrampolined
}

export function crankWith ({ processMsg, processSpawn, logger }) {
  const crankList = crankListWith({ processMsg, processSpawn, logger })

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(crankList))
      .map(logger.tap('Cranked msgs'))
  }
}
