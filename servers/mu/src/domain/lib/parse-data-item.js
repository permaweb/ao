import { of, fromPromise } from 'hyper-async'
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
      .chain(fromPromise(
        async (dataItem) => ({
          tx: { id: await dataItem.id, processId: dataItem.target, data: ctx.raw },
          dataItem: {
            id: await dataItem.id,
            signature: dataItem.signature,
            owner: dataItem.owner,
            target: dataItem.target,
            tags: dataItem.tags,
            /**
             * For some reason, anchor is not included in the toJSON api on DataItem,
             * so we make sure to include it here
             */
            anchor: dataItem.anchor

          }
        })
      ))
      .map(mergeRight(ctx))
      .map(logger.tap('Successfully parsed data item and added as "tx" to ctx'))
}
