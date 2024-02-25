import { compose as composeStreams, Transform } from 'node:stream'

import { of } from 'hyper-async'
import { mergeRight } from 'ramda'
import { z } from 'zod'
import WarpArBundles from 'warp-arbundles'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { streamSchema } from '../model.js'
import { errFrom, findRawTag } from '../utils.js'

const { createData } = WarpArBundles

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  messages: streamSchema
}).passthrough()

/**
 * Converts an arraybuffer into base64, also handling
 * the Unicode Problem: https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */
export function bytesToBase64 (bytes) {
  return Buffer.from(bytes).toString('base64')
}

export function maybeMessageIdWith ({ logger }) {
  /**
   * To calculate the messageId, we set the owner to 0 bytes,
   * and so the owner length will also be 0 bytes.
   *
   * So we pass in these signer parameters when creating the data item
   * so that all of the lengths match up
   */
  const signer = {
    publicKey: Buffer.from(''),
    ownerLength: 0,
    signatureLength: 512,
    signatureType: 1
  }

  /**
   * This function will calculate the deep hash of the information
   * contained in a data item. We use this to detect whether a particular message
   * has already been evaluated, and therefore should be skipped during the current eval
   * (ie. a message was cranked twice)
   */
  async function calcDataItemDeepHash ({ data, tags, target, anchor }) {
    return Promise.resolve()
      .then(() => createData(data, signer, { tags, target, anchor }))
      .then((dataItem) => dataItem.getSignatureData())
      .then(bytesToBase64)
  }

  return async function * maybeMessageId (messages) {
    for await (const cur of messages) {
      /**
       * Not forwarded, so no need to calculate a message id
       */
      if (!cur.message['Forwarded-By']) {
        yield cur
        continue
      }

      // logger('Message "%s" is forwarded. Calculating messageId...', cur.message.Id)
      try {
        cur.deepHash = await calcDataItemDeepHash({
          data: cur.message.Data,
          tags: cur.message.Tags,
          target: cur.message.Target,
          anchor: cur.message.Anchor
        })
      } catch (err) {
        // TODO: is skipping over the message the proper thing to do here?
        const newErr = errFrom(err)
        logger(
          'Encountered err when calculating deephash of forwarded message %s to %s. Skipping its evaluation...',
          cur.message.Id,
          cur.message.Target,
          newErr
        )
        continue
      }

      yield cur
    }
  }
}

export function maybeAoLoadWith ({ loadTransactionData, loadTransactionMeta, logger }) {
  loadTransactionData = loadTransactionDataSchema.implement(loadTransactionData)
  loadTransactionMeta = loadTransactionMetaSchema.implement(loadTransactionMeta)

  /**
   * Construct the JSON representation of a DataItem using
   * raw transaction data, and metadata about the
   * transactions (in the shape of a GQL Gateway Transaction)
   */
  function messageFromParts ({ data, meta }) {
    return {
      Id: meta.id,
      Signature: meta.signature,
      Owner: meta.owner.address,
      Tags: meta.tags,
      Anchor: meta.anchor,
      /**
       * Encode the array buffer of the raw data as base64
       */
      Data: bytesToBase64(data)
    }
  }

  return async function * maybeAoLoad (messages) {
    for await (const cur of messages) {
      const tag = findRawTag('Load', cur.message.Tags)
      /**
       * Either a cron message or not an ao-load message, so no work is needed
       */
      if (!tag || cur.message.Cron) {
        yield cur
        continue
      }

      // logger('Hydrating Load message for "%s" from transaction "%s"', cur.message.Id, tag.value)
      /**
       * - Fetch raw data and meta from gateway
       * - contruct the data item JSON, encoding the raw data as base64
       * - set as 'data' on the ao-load message
       */
      cur.message.Data = await Promise.all([
        loadTransactionData(tag.value).then(res => res.arrayBuffer()),
        loadTransactionMeta(tag.value)
      ]).then(([data, meta]) => messageFromParts({ data, meta }))

      // logger('Hydrated Load message for "%s" from transaction "%s" and attached as data', cur.message.Id, tag.value)

      yield cur
    }
  }
}

/**
 * @typedef Args
 * @property {string} id - the id of the process
 *
 * @typedef Result
 * @property {Stream} messages - the stream of messages, with calculated messageIds, data loading, and Forwarded-By and
 *
 * @callback LoadSource
 * @param {Args} args
 * @returns {Async<Result & Args>}
 *
 * @param {any} env
 * @returns {LoadSource}
 */
export function hydrateMessagesWith (env) {
  const logger = env.logger.child('hydrateMessages')
  env = { ...env, logger }

  const maybeMessageId = maybeMessageIdWith(env)
  const maybeAoLoad = maybeAoLoadWith(env)

  return (ctx) => {
    return of(ctx)
      .map(({ messages: $messages }) => {
        /**
         * There is some sort of bug in pipeline which will consistently cause this stream
         * to not end IFF it emits an error.
         *
         * When errors are thrown in other places, pipeline seems to work and close the stream just fine.
         * So not sure what's going on here.
         *
         * This seemed to be the only way to successfully
         * end the stream, thus closing the pipeline, and resolving
         * the promise wrapping the stream (see finished in evaluate.js)
         *
         * See https://github.com/nodejs/node/issues/40279#issuecomment-1061124430
         */
        $messages.on('error', () => $messages.emit('end'))

        return composeStreams(
          $messages,
          Transform.from(maybeMessageId),
          Transform.from(maybeAoLoad)
        )
      })
      .map(messages => ({ messages }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
