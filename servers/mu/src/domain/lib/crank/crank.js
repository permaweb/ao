import { of, fromPromise } from 'hyper-async'

function crankListWith ({ processMsg, processSpawn, logger }) {
  function asyncTrampoline (fn) {
    return async function (...args) {
      let result = fn(...args)

      while (result && result instanceof Promise) {
        const resolved = await result
        if (typeof resolved === 'function') result = resolved()
        else result = null
      }

      return result
    }
  }

  async function processMessages (ctx) {
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

    /**
     * We cannot know how many downstream outbox messages a message will produce. If we simply recursed
     * immediately, with enough messages, it could overflow the callstack, due to V8s lack of tail-call
     * optimization.
     *
     * So instead of immediately recursing, we instead return a thunk that performs the next "recursive" call.
     * This will result in this invocation being immediately popped off the callstack, before another invocation
     * is pushed onto the stack. Hence, there are no nested calls, and the stack does not grow unboundly.
     *
     * This pattern is called a trampoling, due to the way a single call is pushed onto, then popped
     * off, the callstack.
     *
     * This is also referred to as continuation-passing style, commonly used as intermediate format in compilers
     */
    return () => processMessages({ ...ctx, ...newCtx, msgs: combinedMsgs, spawns: combinedSpawns })
  }

  return asyncTrampoline(processMessages)
}

export function crankWith ({ processMsg, processSpawn, logger }) {
  const crankList = crankListWith({ processMsg, processSpawn, logger })

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(crankList))
      .map(logger.tap('Cranked msgs'))
  }
}
