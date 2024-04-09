import { of } from 'hyper-async'

import { parseDataItemWith } from '../lib/parse-data-item.js'
import { startWith } from '../lib/start-process.js'

export function monitorProcessWith ({
  logger,
  createDataItem,
  startProcessMonitor
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const start = startWith({ logger, startProcessMonitor })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(start)
  }
}
