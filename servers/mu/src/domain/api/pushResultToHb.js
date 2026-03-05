import { Rejected, Resolved, fromPromise, of } from 'hyper-async'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { pullResultWith } from '../lib/pull-result.js'

export function pushResultToHbWith ({
  selectNode,
  fetchResult,
  buildAndSign,
  logger,
  HB_GRAPHQL_URL,
  ENABLE_PUSH,
  fetch
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const pullResult = pullResultWith({ fetchResult, logger })
  const buildAndSignAsync = fromPromise(buildAndSign)

  const uploadToHb = async ({ signedDataItem, processId, messageId, logId }) => {
    const url = `${HB_GRAPHQL_URL}/id?codec-device=ans104@1.0`
    logger({ log: `[pushResultToHb] Uploading signed data item to HB: ${url} processId=${processId} messageId=${messageId} logId=${logId}` })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: signedDataItem
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`[pushResultToHb] HB upload failed: ${res.status} ${text}`)
    }
    logger({ log: `[pushResultToHb] HB upload succeeded: ${text}` })
    return text
  }

  const uploadToHbAsync = fromPromise(uploadToHb)

  return (ctx) => {
    return of(ctx)
      .chain(getCuAddress)
      .chain(pullResult)
      .chain((res) => {
        if(!ENABLE_PUSH) {
          return Rejected(new Error('Repush not enabled on this MU.', { cause: ctx }))
        }
        const { msgs, number } = res
        if (msgs.length <= number) {
          return Rejected(new Error('Message number does not exist in the result.', { cause: ctx }))
        }
        return Resolved(res)
      })
      .chain((res) => {
        const { msgs, number } = res
        const targetMsg = msgs[number].msg
        logger({ log: `[pushResultToHb] Building and signing result message ${number} for ${ctx.tx.id} -> target=${targetMsg.Target}` })
        console.dir({ targetMsg }, { depth: null })
        return buildAndSignAsync({
          processId: targetMsg.Target,
          tags: targetMsg.Tags,
          anchor: targetMsg.Anchor,
          data: targetMsg.Data
        }).chain((tx) => {
          logger({ log: `[pushResultToHb] Signed data item id=${tx.id}, uploading to HB` })
          return uploadToHbAsync({
            signedDataItem: tx.data,
            processId: ctx.tx.processId,
            messageId: ctx.tx.id,
            logId: ctx.logId
          }).map((hbRes) => ({ ...res, hbRes, txId: tx.id }))
        })
      })
  }
}
