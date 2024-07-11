import { of, Rejected, fromPromise, Resolved } from 'hyper-async'
import { identity } from 'ramda'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { writeMessageTxWith } from '../lib/write-message-tx.js'
import { pullResultWith } from '../lib/pull-result.js'
import { parseDataItemWith } from '../lib/parse-data-item.js'
import { verifyParsedDataItemWith } from '../lib/verify-parsed-data-item.js'
import { writeProcessTxWith } from '../lib/write-process-tx.js'

/**
 * Forward along the DataItem to the SU,
 *
 * and conditionally crank based on whether the DataItem
 * is an ao Message or not
 */
export function sendDataItemWith ({
  selectNode,
  createDataItem,
  writeDataItem,
  locateScheduler,
  locateProcess,
  fetchResult,
  crank,
  logger,
  fetchSchedulerProcess,
  writeDataItemArweave
}) {
  const verifyParsedDataItem = verifyParsedDataItemWith()
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ locateProcess, writeDataItem, logger, fetchSchedulerProcess, writeDataItemArweave })
  const pullResult = pullResultWith({ fetchResult, logger })
  const writeProcess = writeProcessTxWith({ locateScheduler, writeDataItem, logger })

  const locateProcessLocal = fromPromise(locateProcess)

  /**
     * If the data item is a Message, then cranking and tracing
     * must also be performed.
     */
  const sendMessage = (ctx) => of({ ...ctx, message: ctx.dataItem })
    .map(logger.tap({ log: 'Sending message...' }))
    .map(({ message, ...rest }) => ({
      ...rest,
      message
    }))
    .chain(({ message, ...rest }) =>
      of({ ...rest })
        .chain(writeMessage)
        .bichain(
          (error) => {
            return of(error)
              .map(() => logger({ log: `Initial message failed: ${message.id} with error` }, ctx))
              .chain(() => Rejected(error))
          },
          (res) => Resolved(res)
        )
        .map(res => ({
          ...res,
          /**
             * An opaque method to fetch the result of the message just forwarded
             * and then crank its results
             */
          crank: () => of({ ...res, initialTxId: res.tx.id })
            .chain(getCuAddress)
            .chain(pullResult)
            .chain((ctx) => {
              const { msgs, spawns, assigns, initialTxId, messageId: parentId } = ctx
              return crank({
                msgs,
                spawns,
                assigns,
                initialTxId,
                parentId
              })
            })
            .bimap(
              (res) => {
                logger({ log: 'Failed to push messages', end: true }, ctx)
                return res
              },
              (res) => {
                logger({ log: 'Pushing complete', end: true }, ctx)
                return res
              }
            )
        }))
    )

  /**
     * Simply write the process to the SU
     * and return a noop crank
     */
  const sendProcess = (ctx) => of(ctx)
    .map(logger.tap({ log: 'Sending process...' }))
    .chain(writeProcess)
    .map((res) => ({
      ...res,
      /**
         * There is nothing to crank for a process sent to the MU,
         * so the crank method will simply noop, keeping the behavior
         * a black box - unless there is an Target tag on the spawn.
         */
      crank: () => of({ res })
        .chain(({ res }) => {
          const hasTarget = Boolean(res.dataItem.target)
          if (hasTarget) {
            return Rejected({ res })
          }
          return Resolved()
        })
        .bichain(({ res }) => {
          const assigns = [{ Message: res.dataItem.id, Processes: [res.dataItem.target] }]
          return crank({
            msgs: [],
            spawns: [],
            assigns,
            initialTxId: res.tx.id
          })
        }, Resolved)
        .bimap(
          (res) => {
            logger({ log: 'Assignments pushed for Process DataItem.', end: true }, ctx)
            return res
          },
          (res) => {
            logger({ log: 'No pushing for a Process DataItem without target required. Nooping...', end: true }, ctx)
            return res
          }
        )
    }))

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain((ctx) =>
        verifyParsedDataItem(ctx.dataItem)
          .map(logger.tap({ log: 'Successfully verified parsed data item', logId: ctx.logId }))
          .chain(({ isMessage }) => {
            if (isMessage) {
              /*
                  add schedLocation into the context if the
                  target is a process. if its a wallet dont add
                  schedLocation and it will get sent directly to
                  Arweave
              */
              return locateProcessLocal(ctx.dataItem.target)
                .map(logger.tap({ log: 'Successfully located process scheduler', logId: ctx.logId }))
                .chain((schedLocation) => sendMessage({ ...ctx, schedLocation }))
            }
            return sendProcess(ctx)
          })
          .bimap(
            (e) => new Error(e, { cause: ctx }),
            identity
          )
      )
  }
}
