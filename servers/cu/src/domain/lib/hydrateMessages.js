import { Transform } from 'node:stream'

import { of } from 'hyper-async'
import { mergeRight, isNil } from 'ramda'
import WarpArBundles from 'warp-arbundles'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { messageSchema } from '../model.js'
import { mapFrom, addressFrom } from '../utils.js'

const { createData } = WarpArBundles

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
      .then(async ([meta, Data]) => {
        const address = addressFrom(meta.owner)

        return {
          Id: meta.id,
          Signature: meta.signature,
          Owner: address,
          From: mapFrom({ tags: meta.tags, owner: address }),
          Target: meta.recipient || '',
          Tags: meta.tags,
          Anchor: meta.anchor,
          Data
        }
      })
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
      /**
       * isNil(data) ? '' : data was added to handle the case
       * where data is null or undefined. After aop 6, the Data
       * field of the first Message is the Data field of the Process
       * because the Process is the first Message. Because it is not
       * string data in many cases the SU is outputting null.
       *
       * See: https://github.com/permaweb/ao/issues/730
       */
      .then(() => createData(isNil(data) ? '' : data, signer, { tags, target, anchor }))
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

        return [
          ...$messages,
          Transform.from(maybeMessageId),
          Transform.from(maybeAoAssignment),
          // Ensure every message emitted satisfies the schema
          Transform.from(async function * (messages) {
            for await (const cur of messages) yield messageSchema.parse(cur)
          })
        ]
      })
      .map(messages => ({ ...ctx, messages }))
  }
}
