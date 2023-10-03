import { of, fromPromise } from 'hyper-async'

function crankListWith ({ processMsg, logger }) {
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
      return ctx
    }

    const [head, ...tail] = ctx.msgs

    const newCtx = await of(head).chain(() => processMsg({ cachedMsg: head })).toPromise()

    const combinedMsgs = [...(newCtx.msgs || []), ...tail]

    return async function nextIteration () {
      return processMessages({ ...ctx, ...newCtx, msgs: combinedMsgs })
    }
  })

  return processMsgsTrampolined
}

export function crankWith ({ processMsg, logger }) {
  const crankList = crankListWith({ processMsg, logger })

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(crankList))
      .map(logger.tap('Cranked msgs'))
  }
}
