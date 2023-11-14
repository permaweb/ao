import { pipeline, Transform } from 'node:stream'

import { of } from 'hyper-async'
import { mergeRight } from 'ramda'
import { z } from 'zod'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { streamSchema } from '../model.js'
import { findRawTag } from './utils.js'

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
 * Construct the JSON representation of a DataItem using
 * raw transaction data, and metadata about the
 * transactions (in the shape of a GQL Gateway Transaction)
 */
function messageFromParts ({ data, meta }) {
  return {
    id: meta.id,
    owner: meta.owner.address,
    tags: meta.tags,
    anchor: meta.anchor,
    /**
     * Encode the array buffer of the raw data as base64
     */
    data: bytesToBase64(data)
  }
}

/**
 * Converts an arraybuffer into base64, also handling
 * the Unicode Problem: https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */
export function bytesToBase64 (bytes) {
  const binString = String.fromCodePoint(...new Uint8Array(bytes))
  return btoa(binString)
}

/**
 * TODO implement
 */
function maybeMessageIdWith ({ findMessageId, logger }) {
  return async function * maybeMessageId (messages) {
    logger('Hydrating forwarded messages with message id...')

    for await (const cur of messages) {
      /**
       * Not forwarded, so no need to calculate a message id
       */
      if (!cur.message['Forwarded-For']) {
        yield cur
        continue
      }

      logger('Message "%s" is forwarded. Calculating messageId...', cur.sortKey)
      // TODO: implement
      // calculate the message id

      logger('Checking if "%s" has already been evaluated...', cur.sortKey)
      // TODO: implement
      // if found, don't emit
      yield cur
    }
  }
}

export function maybeAoLoadWith ({ loadTransactionData, loadTransactionMeta, logger }) {
  loadTransactionData = loadTransactionDataSchema.implement(loadTransactionData)
  loadTransactionMeta = loadTransactionMetaSchema.implement(loadTransactionMeta)

  return async function * maybeAoLoad (messages) {
    logger('Hydrating ao-load message with data from arweave...')
    for await (const cur of messages) {
      const tag = findRawTag('ao-load', cur.message.tags)
      /**
       * Either a scheduled message (which has no id)
       * or not an ao-load message, so no work is needed
       */
      if (!tag || !cur.message.id) {
        yield cur
        continue
      }

      logger('Constructing ao-load message for "%s" from transaction "%s"', cur.sortKey, tag.value)
      /**
       * - Fetch raw data and meta from gateway
       * - contruct the data item JSON, encoding the raw data as base64
       * - set as 'data' on the ao-load message
       */
      cur.message.data = await Promise.all([
        loadTransactionData(tag.value).then(res => res.arrayBuffer()),
        loadTransactionMeta(tag.value)
      ]).then(([data, meta]) => messageFromParts({ data, meta }))

      logger('Constructed ao-load message for "%s" from transaction "%s" and attached as data', cur.sortKey, tag.value)

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
        return pipeline(
          $messages,
          Transform.from(maybeMessageId),
          Transform.from(maybeAoLoad),
          (err) => {
            if (err) logger('Encountered err when hydrating ao-load and forwarded-for messages', err)
          }
        )
      })
      .map(messages => ({ messages }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
