import { of } from 'hyper-async'
import { mergeRight } from 'ramda'

/**
 * Given a Buffer that contains the DataItem,
 * construct a POJO using the parsed data from the DataItem buffer
 *
 * This is how we will access metadata from the dataitem itself
 */
export function parseDataItemWith ({ createDataItem, logger }) {
  return (ctx) =>
    of(ctx.raw)
      .map(createDataItem)
      /**
       * Everything downstream expects a tx field, so construct it and add to context
       */
      .map(dataItem => ({ tx: { id: dataItem.id, processId: dataItem.target, data: ctx.raw } }))
      .map(mergeRight(ctx))
      .map(logger.tap('Successfully parsed data item and added as "tx" to ctx'))
}
