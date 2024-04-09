import { of } from 'hyper-async'

import { parseDataItemWith } from '../lib/parse-data-item.js'
import { stopWith } from '../lib/stop-process.js'

export function stopMonitorProcessWith ({
  logger,
  createDataItem,
  stopProcessMonitor
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const stop = stopWith({ logger, stopProcessMonitor })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(stop)
  }
}
