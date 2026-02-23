import { of, Rejected } from 'hyper-async'

import { parseDataItemWith } from '../lib/parse-data-item.js'
import { startWith } from '../lib/start-process.js'

export function monitorProcessWith ({
  logger,
  createDataItem,
  startProcessMonitor,
  fetchProcessWhitelist
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const start = startWith({ logger, startProcessMonitor })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain((ctx) => {
        const whitelist = fetchProcessWhitelist ? fetchProcessWhitelist() : {}
        if (whitelist && Object.keys(whitelist).length > 0 && !whitelist[ctx.tx.processId]) {
          const error = new Error('Forbidden, process not whitelisted')
          error.code = 403
          return Rejected(error)
        }
        return of(ctx)
      })
      .chain(start)
  }
}
