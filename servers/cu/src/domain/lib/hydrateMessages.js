import { compose as composeStreams, PassThrough, Transform } from 'node:stream'

import { of } from 'hyper-async'
import { mergeRight } from 'ramda'
import { z } from 'zod'
import WarpArBundles from 'warp-arbundles'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { messageSchema, streamSchema } from '../model.js'
import { mapFrom } from '../utils.js'

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

function loadFromChainWith ({ loadTransactionData, loadTransactionMeta }) {
  loadTransactionData = loadTransactionDataSchema.implement(loadTransactionData)
  loadTransactionMeta = loadTransactionMetaSchema.implement(loadTransactionMeta)

  return async ({ id, exclude = [], encodeData }) => {
    const promises = []

    const options = exclude.reduce((options, e) => {
      options[`skip${e}`] = true
      return options
    }, {})

    promises.push(loadTransactionMeta(id, options))

    if (!exclude.includes('Data')) {
      promises.push(
        loadTransactionData(id)
          /**
           * Encode the array buffer of the raw data as base64, if desired (Load messages),
           * otherwise parse the data as text (Assignments)
           *
           * TODO: should cu use Content-Type tag to parse data? ie. json, text, etc.
           * For now, Data is always text or base64-encoded array buffer, so this replicates
           * current functionality
           */
          .then((res) => encodeData
            ? res.arrayBuffer()
              .then((ab) => Buffer.from(ab))
              .then((data) => bytesToBase64(data))
            : res.text())
      )
    }

    return Promise.all(promises)
      /**
       * Construct the JSON representation of a DataItem using
       * raw transaction data, and metadata about the
       * transactions (in the shape of a GQL Gateway Transaction)
       */
      .then(async ([meta, Data]) => ({
        Id: meta.id,
        Signature: meta.signature,
        Owner: meta.owner.address,
        From: mapFrom({ tags: meta.tags, owner: meta.owner.address }),
        Tags: meta.tags,
        Anchor: meta.anchor,
        Data
      }))
  }
}

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

      try {
        /**
         * TODO: if the message is ill-formatted in anyway, ie. incorrect length anchor
         * or target, it will cause eval to fail entirely.
         *
         * But skipping the message doesn't seem kosher. What should we do?
         */
        cur.deepHash = await calcDataItemDeepHash({
          data: cur.message.Data,
          tags: cur.message.Tags,
          target: cur.message.Target,
          anchor: cur.message.Anchor
        })
        yield cur
      } catch (err) {
        logger(
          'Encountered Error when calculating deep hash of message "%s"',
          cur.message.Id,
          err
        )
        throw err
      }
    }
  }
}

export function maybeAoAssignmentWith ({ loadTransactionData, loadTransactionMeta }) {
  const loadFromChain = loadFromChainWith({ loadTransactionData, loadTransactionMeta })

  return async function * maybeAoAssignment (messages) {
    for await (const cur of messages) {
      /**
       * Not an Assignment so nothing to do
       */
      if (!cur.isAssignment) { yield cur; continue }

      /**
       * The values are loaded from chain and used to overwrite
       * the specific fields on the message
       *
       * TODO: should Owner be overwritten? If so, what about From?
       * currently, this will overwrite both, set to the owner of the message on-chain
       */
      cur.message = mergeRight(
        cur.message,
        await loadFromChain({
          id: cur.message.Id,
          exclude: cur.exclude,
          encodeData: false
        })
      )

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
  const maybeAoAssignment = maybeAoAssignmentWith(env)

  return (ctx) => {
    return of(ctx)
      .map(({ messages: $messages }) => {
        /**
         * See https://github.com/nodejs/node/issues/40279#issuecomment-1061124430
         */
        // $messages.on('error', () => $messages.emit('end'))

        return composeStreams(
          /**
           * There is some sort of bug in pipeline which will consistently cause this stream
           * to not end IFF it emits an error.
           *
           * When errors are thrown in other points in the stream, pipeline seems to work and
           * close the stream just fine, so not sure what's going on here.
           *
           * Before, we had a workaround to manually emit 'end' from the stream on eror, which seemed
           * to work (See above commented out .on())
           *
           * That was UNTIL we composed more than 2 Transform streams after it, which caused that
           * workaround to no longer work -- very strange.
           *
           * For some reason, wrapping the subsequent Transforms in another compose,
           * AND adding a PassThrough stream at the end successfully ends the stream on errors,
           * thus closing the pipeline, and resolving the promise wrapping the stream
           * (see finished in evaluate.js)
           */
          $messages,
          composeStreams(
            Transform.from(maybeMessageId),
            Transform.from(maybeAoAssignment),
            // Ensure every message emitted satisfies the schema
            Transform.from(async function * (messages) {
              for await (const cur of messages) yield messageSchema.parse(cur)
            })
          ),
          new PassThrough({ objectMode: true })
        )
      })
      .map(messages => ({ messages }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
