// import { messageTraceSchema } from '../model.js'

/**
 * Given a message, it's parent, and the origin of the message (from - a wallet or process)
 *
 * return an API that can be used to incrementally build a trace and then unwrap the full trace domain
 * model, that can then be persisted
 */
export function tracerFor ({ message, parent, from }) {
  const trace = []
  const children = []
  const spawns = []

  const tracedAt = new Date()

  return {
    child: (c) => children.push(c),
    spawn: (s) => spawns.push(s),
    trace: (t) => trace.push(t),
    unwrap: () => ({
      id: message.id,
      parent,
      children,
      spawns,
      from,
      to: message.Target || message.target,
      message,
      trace,
      tracedAt
    })
    // unwrap: () => messageTraceSchema.parse({
    //   id: message.id,
    //   parent,
    //   children,
    //   spawns,
    //   from,
    //   to: message.Target || message.target,
    //   message,
    //   trace,
    //   tracedAt
    // })
  }
}
