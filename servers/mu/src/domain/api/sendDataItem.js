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
  writeDataItemArweave,
  spawnPushEnabled
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
   * If the Data Item is a Process, we push an Assignment
   * if the target is present. And as per aop6 Boot Loader
   * a result is also pulled from the CU for the process id.
   *
   * see https://github.com/permaweb/ao/issues/730
   */
  const sendProcess = (ctx) => of(ctx)
    .map(logger.tap({ log: 'Sending process...' }))
    .chain(writeProcess)
    .map((res) => ({
      ...res,
      /**
       * If there is a Target tag on the spawn, push an Assignment.
       * In all cases for new processes, a result will be called on the
       * CU for the process id itself, in order to trigger an initial
       * boot loader evaluation.
       */
      crank: () => of({ res })
        .chain(({ res }) => {
          if (!spawnPushEnabled) {
            return Resolved({
              ...res,
              msgs: [],
              spawns: [],
              assigns: [],
              initialTxId: res.initialTxId
            })
          }
          /**
           * Override the processId fields of tx and res, because parse-data-item sets it
           * to the target, but on a spawn we want it to be the id of the Data Item
           *
           * This is so getCuAddress and pullResult both operate properly.
           */
          return of({ ...res, tx: { ...res.tx, processId: res.tx.id }, processId: res.tx.id, initialTxId: res.tx.id })
            .chain(getCuAddress)
            .chain(pullResult)
        })
        .chain((res) => {
          const hasTarget = Boolean(res.dataItem.target)
          if (hasTarget) {
            return Rejected({ res })
          }
          return Resolved({ res })
        })
        .bichain(
          ({ res }) => {
            /**
             * If there is a target add this assignment
             */
            const assigns = [
              { Message: res.dataItem.id, Processes: [res.dataItem.target] },
              ...res.assigns
            ]
            return crank({
              msgs: res.msgs,
              spawns: res.spawns,
              assigns,
              initialTxId: res.tx.id
            })
          },
          ({ res }) => {
            /**
             * If no target just push the result of the boot loader
             * result call
             */
            return crank({
              msgs: res.msgs,
              spawns: res.spawns,
              assigns: res.assigns,
              initialTxId: res.tx.id
            })
          }
        )
        .bimap(
          (res) => {
            logger({ log: 'Assignments pushed for Process DataItem.', end: true }, ctx)
            return res
          },
          (res) => {
            logger({ log: 'No pushing an Assignment for a Process DataItem without target required.', end: true }, ctx)
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
