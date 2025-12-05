/* eslint-disable camelcase */
import { Readable, Transform } from 'node:stream'

import { always, applySpec, filter, isEmpty, isNil, isNotNil, juxt, last, mergeAll, nth, path, pathOr, pipe, prop } from 'ramda'
import DataLoader from 'dataloader'
import createKeccakHash from 'keccak'
import { LRUCache } from 'lru-cache'

import { backoff, mapForwardedBy, mapFrom, parseTags, strFromFetchError } from '../../domain/utils.js'

const okRes = (res) => {
  if (res.ok) return res
  throw res
}

const resToJson = (res) => {
  if (res.edges) {
    return res
  }
  /**
   * Janky extra parse b/c HB currently sends back a string
   * that contains a JSON object, that must be parsed further.
   *
   * TODO: remove later.
   */
  return res.json().then(maybeJSON => typeof maybeJSON === 'object'
    ? maybeJSON
    : JSON.parse(maybeJSON)
  )
}

/**
 * GET /...?target=ProcID[&from=X&to=y]&accept=application/aos-2
 */
const toParams = ({ processId, from, to, pageSize }) =>
  new URLSearchParams(filter(
    isNotNil,
    { target: processId, from, to, limit: pageSize, accept: 'application/aos-2' }
  ))

const nodeAt = (idx) => pipe(path(['edges']), nth(idx), path(['node']))

/**
 * TODO: eventually actually locate the scheduler
 * For now, just always returning the HB_URL
 */
export const locateProcessWith = ({ fetch, HB_URL }) => {
  return async ({ processId }) => {
    return { url: HB_URL }
  }
}

export const isHashChainValidWith = ({ hashChain }) => async (prev, scheduled) => {
  const { assignmentId: prevAssignmentId, hashChain: prevHashChain } = prev
  const { message } = scheduled
  const actual = message['Hash-Chain']

  /**
   * Depending on the source of the hot-start, there may not be
   * a prev assignmentId and hashChain
   */
  if (!prevAssignmentId || !prevHashChain) return !!actual

  const expected = await hashChain(prevHashChain, prevAssignmentId)
  return expected === actual
}

const SIG_CONFIG = {
  ARWEAVE: {
    sigLength: 512,
    pubLength: 512,
    sigName: 'arweave'
  },
  ETHEREUM: {
    sigLength: 65,
    pubLength: 65,
    sigName: 'ethereum'
  }
}

const cache = new LRUCache({ max: 1000 })
/**
 * From ethereum docs: https://ethereum.org/en/developers/docs/accounts/#account-creation
 *
 * You get a public address by taking the last 20 bytes of
 * the Keccak-256 hash of the public key and adding 0x to the beginning.
 * A checksum must also be applied.
 */
function keyToEthereumAddress (key) {
  /**
   * We need to decode, then remove the first byte denoting compression in secp256k1
   */
  const noCompressionByte = Buffer.from(key, 'base64url').subarray(1)

  /**
   * the un-prefixed address is the last 20 bytes of the hashed
   * public key
   */
  const noPrefix = createKeccakHash('keccak256')
    .update(noCompressionByte)
    .digest('hex')
    .slice(-40)

  /**
   * Apply the checksum see https://eips.ethereum.org/EIPS/eip-55
   */
  const hash = createKeccakHash('keccak256')
    .update(noPrefix)
    .digest('hex')

  let checksumAddress = '0x'
  for (let i = 0; i < noPrefix.length; i++) {
    checksumAddress += parseInt(hash[i], 16) >= 8
      ? noPrefix[i].toUpperCase()
      : noPrefix[i]
  }

  return checksumAddress
}

/**
 * Given the address and public key, generate the owner.
 * This function is memoized, and deduped, for performance, caching the most recent
 * 1000 computed owners
 *
 * @param {{ address: string, key: string }} arg
 * @returns {string}
 */
export const addressFrom = ({ address, key }) => {
  /**
   * If we do not have the key, then the address
   * MUST be what we use
   */
  if (!key) return address

  const cKey = `${address}-${key}`
  if (cache.has(cKey)) return cache.get(cKey)

  const pubKeyLength = Buffer.from(key, 'base64url').length
  let _address

  if (pubKeyLength === SIG_CONFIG.ETHEREUM.pubLength) _address = keyToEthereumAddress(key)
  else if (pubKeyLength === SIG_CONFIG.ARWEAVE.pubLength) _address = address
  /**
   * Assume the address is the owner
   *
   * TODO: implement bonafide logic for other signers
   */
  else _address = address

  cache.set(cKey, _address)

  return _address
}

export const mapNode = (type) => pipe(
  juxt([
    // derived from assignment
    pipe(
      path(['assignment']),
      (assignment) => {
        const tags = parseTags(assignment.Tags)

        return applySpec({
          /**
           * The assignment id is needed in order to compute
           * and verify the hash chain
           */
          AssignmentId: always(assignment.Id),
          /**
           * There could be multiple Exclude tags,
           * but parseTags will accumulate them into an array,
           *
           * which is what we want
           */
          Exclude: path(['Exclude']),
          /**
           * Data from the assignment, to be placed
           * on the message
           */
          message: applySpec({
            Target: path(['Process']),
            Epoch: pipe(path(['Epoch']), parseInt),
            Nonce: pipe(path(['Slot'])(tags) ? path(['Slot']) : path(['Nonce']), parseInt),
            Timestamp: pipe(path(['Timestamp']), parseInt),
            'Block-Height': pipe(
              /**
               * Returns a left padded integer like '000001331218'
               *
               * So use parseInt to convert it into a number
               */
              path(['Block-Height']),
              parseInt
            ),
            'Hash-Chain': path(['Hash-Chain'])
          })
        })(tags)
      }
    ),
    // derived from message
    pipe(
      path(['message']),
      (message) => {
        /**
         * No message, or only Id, meaning this is an Assignment for an existing message
         * on chain, to be hydrated later (see hydrateMessages)
         */
        if (Object.keys(message).length === 1) return { Id: message.Id }

        const address = addressFrom({ address: message.Owner, key: message.PublicKey })
        return applySpec({
          Id: path(['Id']),
          Signature: path(['Signature']),
          Data: path(['Data']),
          Owner: always(address),
          Anchor: path(['Anchor']),
          From: always(mapFrom({ tags: message.Tags, owner: address })),
          'Forwarded-By': always(mapForwardedBy({ tags: message.Tags, owner: address })),
          Tags: pipe(
            pathOr([], ['Tags']),
            // Some tags are being returned as non strings, so coerce them to strings
            (tags) => tags.map(t => ({ name: t.name, value: `${t.value}` }))
          )
        })(message)
      }
    ),
    // both
    applySpec({
      /**
       * In the case of an assignment of a message on-chain, only the Id
       * will be present.
       *
       * So checking for any other field, like 'Owner' should tell us
       * whether this is an assignment of data on-chain or not.
       */
      isAssignment: type === 'message'
        ? pipe(
          path(['message', 'Owner']),
          isNil
        )
        : pipe(
          path(['message', 'Target']),
          (m) => isNil(m) || isEmpty(m)
        )
    }),
    // static
    always({ Cron: false })
  ]),
  // Combine into the desired shape
  ([fAssignment, fMessage = {}, fBoth, fStatic]) => ({
    cron: undefined,
    ordinate: fAssignment.message.Nonce,
    name: `${fBoth.isAssignment ? 'Assigned' : 'Scheduled'} Message ${fMessage.Id} ${fAssignment.message.Timestamp}:${fAssignment.message.Nonce}`,
    exclude: fAssignment.Exclude,
    isAssignment: fBoth.isAssignment,
    assignmentId: fAssignment.AssignmentId,
    message: mergeAll([
      fMessage,
      fAssignment.message,
      /**
       * We must ensure that this field is always set, regardless if this is a message
       * or just an Assignment for an existing message on-chain
       */
      { Id: fMessage.Id },
      /**
       * For an Assignment, the Target is derived from the recipient of
       * the assigned tx.
       *
       * So we explicitly set Target to undefined here, such that hydration of Target
       * must occur later. Otherwise we will receive high signal, in the form of an error,
       * that the impl is incorrect, as opposed to an assignment potentially being misinterpreted
       * as a bonafide scheduled message.
       */
      { Target: fBoth.isAssignment ? undefined : fAssignment.message.Target },
      fStatic
    ]),
    /**
     * We need the block metadata per message,
     * so that we can calculate cron messages
     *
     * Separating them here, makes it easier to access later
     * down the pipeline
     */
    block: {
      height: fAssignment.message['Block-Height'],
      timestamp: fAssignment.message.Timestamp
    }
  })
)

export const loadProcessWith = ({ fetch, logger }) => {
  return async ({ suUrl, processId }) => {
    const params = toParams({ processId, from: 0, to: 1, pageSize: 1 })

    return backoff(
      () => fetch(`${suUrl}/~scheduler@1.0/schedule?${params.toString()}`).then(okRes),
      { maxRetries: 5, delay: 500, log: logger, name: `loadProcess(${JSON.stringify({ suUrl, processId })})` }
    )
      .catch(async (err) => {
        logger('Error Encountered when loading process "%s" from SU "%s"', processId, suUrl)
        throw new Error(`Error Encountered when loading process from Scheduler Unit: ${await strFromFetchError(err)}`)
      })
      .then(resToJson)
      .then(nodeAt(0))
      .then(mapNode('process'))
      .then(applySpec({
        owner: applySpec({
          address: path(['message', 'Owner']),
          /**
           * TODO: currently will always be undefined,
           * since HB SU does not return the public key
           * of the owner
           */
          key: path(['key'])
        }),
        tags: path(['message', 'Tags']),
        signature: path(['message', 'Signature']),
        data: path(['message', 'Data']),
        anchor: path(['message', 'Anchor']),
        timestamp: path(['message', 'Timestamp']),
        block: path(['block']),
        processId: always(processId),
        nonce: always(0)
      }))
      .then((res) => {
        // NO PROCESS MESSAGE: Try legacy su
        const type = res.tags?.find(t => t.name?.toLowerCase() === 'type')?.value
        if (type === 'Process') {
          return res
        }
        return backoff(
          () => fetch(`https://su-router.ao-testnet.xyz/processes/${processId}`).then(okRes),
          { maxRetries: 5, delay: 500, log: logger, name: `loadProcess(${JSON.stringify({ suUrl, processId })})` }
        )
          .then(resToJson)
          .then(applySpec({
            owner: path(['owner']),
            tags: path(['tags']),
            block: applySpec({
              height: pipe(
                path(['block']),
                (block) => parseInt(block)
              ),
              /**
               * SU is currently sending back timestamp in milliseconds,
               */
              timestamp: path(['timestamp'])
            }),
            /**
             * These were added for the aop6 Boot Loader change so that
             * the Process can be used properly downstream.
             *
             * See https://github.com/permaweb/ao/issues/730
             */
            processId: always(processId),
            timestamp: path(['timestamp']),
            nonce: always(0),
            signature: path(['signature']),
            data: path(['data']),
            anchor: path(['anchor'])
          }))
      })
  }
}

export const loadTimestampWith = ({ fetch, logger }) => {
  return async ({ suUrl, processId }) => {
    const params = toParams({ processId, from: 0, to: 0, pageSize: 1 })

    return backoff(
      () => fetch(`${suUrl}/~scheduler@1.0/schedule?${params.toString()}`).then(okRes),
      { maxRetries: 5, delay: 500, log: logger, name: `loadTimestamp(${JSON.stringify({ suUrl, processId })})` }
    )
      .catch(async (err) => {
        logger('Error Encountered when loading timestamp for process "%s" from SU "%s"', processId, suUrl)
        throw new Error(`Error Encountered when loading timestamp for process from Scheduler Unit: ${await strFromFetchError(err)}`)
      })
      .then(resToJson)
      .then(({ page_info }) => ({
        timestamp: parseInt(page_info.timestamp),
        height: parseInt(page_info['block-height'])
      }))
  }
}

export const loadMessagesWith = ({ hashChain, fetch, logger: _logger, pageSize }) => {
  const logger = _logger.child('hb-su:loadMessages')

  const isHashChainValid = isHashChainValidWith({ hashChain })

  const fetchPageDataloader = new DataLoader(async (args) => {
    fetchPageDataloader.clearAll()

    return Promise.allSettled(
      args.map(({ suUrl, processId, from, to, pageSize }) => {
        return Promise.resolve({ processId, from: from || 0, to: to || undefined, pageSize })
          .then(toParams)
          .then((params) => fetch(`${suUrl}/~scheduler@1.0/schedule?${params.toString()}`))
          .then(okRes)
          .catch(async (err) => {
            logger(
              'Error Encountered when fetching page of scheduled messages from SU \'%s\' for process \'%s\' between \'%s\' and \'%s\'',
              suUrl, processId, from, to
            )
            throw new Error(`Encountered Error fetching scheduled messages from Scheduler Unit: ${await strFromFetchError(err)}`)
          })
          .then(resToJson)
      })
    ).then((values) =>
    /**
     * By returning the error, Dataloader will register as an error
     * for the individual call to load, without failing the batch as a whole
     *
     * See https://www.npmjs.com/package/dataloader#caching-errors
     */
      values.map(v => v.status === 'fulfilled' ? v.value : v.reason)
    )
  }, {
    cacheKeyFn: ({ suUrl, processId, from, to, pageSize }) => `${suUrl},${processId},${from},${to},${pageSize}`,
    batchScheduleFn: (cb) => setTimeout(cb, 20)
  })

  /**
   * Returns an async generator that emits scheduled messages,
   * one at a time
   *
   * Scheduled messages are fetched a page at a time, but
   * emitted from the generator one message at a time.
   *
   * When the currently fetched page is drained, the next page is fetched
   * dynamically
   */
  function fetchAllPages ({ suUrl, processId, isColdStart, from, to, body }) {
    /**
     * The HB SU 'from' and 'to' are both inclusive.
     * So when we pass from (which is the cached most recent evaluated message)
     * we need to increment by 1, so as to not include the message we have
     * already evaluated.
     *
     * But in the case of a cold start, we _do_ need to include the process
     * message and so do not increment by 1.
     *
     * Similar logic can be found below when checking for the expected nonce
     */

    if (!isColdStart) from = from + 1
    async function fetchPage ({ from }) {
      const params = toParams({ processId, from, to, pageSize })

      return backoff(
        () => {
          const bodyIsValid = body &&
            body.edges.length === (+to - +from + 1) &&
            +body.edges[0]?.node?.assignment?.Tags?.find(t => t.name === 'Nonce' || t.name === 'Slot')?.value === +from
          if (bodyIsValid) return body
          return fetchPageDataloader.load({ suUrl, processId, from, to, pageSize })
        },
        { maxRetries: 5, delay: 500, log: logger, name: `loadMessages(${JSON.stringify({ suUrl, processId, params: params.toString() })})` }
      )
    }

    /**
     * The HB SU has a bug where some boolean values
     * are being sent as string values like 'true'
     * and 'false', which will always be truthy.
     *
     * So as a workaround, we check whether the value is 'false'
     * and coerce to false, and otherwise cast to a boolean.
     */
    function toBoolean (value) {
      return (value === 'false' || value === 'undefined') ? false : Boolean(value)
    }

    return async function * scheduled () {
      let curPage = []
      let curFrom = from
      let hasNextPage = true

      let total = 0

      while (hasNextPage) {
        await Promise.resolve()
          .then(() => {
            logger(
              'Loading next page of max %s messages for process "%s" from SU "%s" between "%s" and "%s"',
              pageSize, processId, suUrl, from || 'initial', to || 'latest'
            )
            return fetchPage({ from: curFrom })
          })
          .then(({ page_info, edges }) => {
            total += edges.length
            curPage = edges
            hasNextPage = toBoolean(page_info.has_next_page)
            curFrom = hasNextPage && pipe(
              last,
              path(['cursor'])
            )(edges)
          })

        while (curPage.length) yield curPage.shift()
      }

      logger(
        'Successfully loaded a total of %s scheduled messages for process "%s" from SU "%s" between "%s" and "%s"...',
        total, processId, suUrl, from || 'initial', to || 'latest')
    }
  }

  function mapAoMessage ({
    processId, processBlock, assignmentId, hashChain, from, isColdStart,
    processOwner, processTags, moduleId, moduleOwner, moduleTags, logger
  }) {
    const AoGlobal = {
      Process: { Id: processId, Owner: processOwner, Tags: processTags },
      Module: { Id: moduleId, Owner: moduleOwner, Tags: moduleTags }
    }
    /**
       * Only perform hash chain validation on processes
       * spawned after arweave day, since old hash chains are invalid
       * anyway.
       */
    const isHashChainValidationEnabled = processBlock.height >= 1440000
    if (!isHashChainValidationEnabled) {
      logger('HashChain validation disabled for old process "%s" at block [%j]', processId, processBlock)
    }

    // Set this to simulate a stream error
    // eslint-disable-next-line
    let simulateError = false
    let prevAssignmentId = assignmentId
    let prevHashChain = hashChain

    // let expectedNonce = parseInt(`${from}`)
    let expectedNonce = isColdStart ? 0 : parseInt(`${from}`) + 1
    return async function * (edges) {
      for await (const edge of edges) {
        const scheduled = pipe(
          prop('node'),
          /**
             * Map to the expected shape
             */
          mapNode('message'),
          (scheduled) => {
            scheduled.AoGlobal = AoGlobal
            return scheduled
          }
        )(edge)

        if (expectedNonce !== scheduled.message.Nonce) {
          const err = new Error(`Non-incrementing slot: expected ${expectedNonce} but got ${scheduled.message.Nonce}`)
          err.status = 422
          throw err
        }

        if (simulateError) {
          logger('<SIMULATED ERROR> message "%s" scheduled on process "%s"', scheduled.message.Id, processId)
          const err = new Error(`Simulated Error on message ${scheduled.message.Id}`)
          err.status = 422
          throw err
        }

        if (isHashChainValidationEnabled) {
          if (!(await isHashChainValid({ assignmentId: prevAssignmentId, hashChain: prevHashChain }, scheduled))) {
            logger('HashChain invalid on message "%s" scheduled on process "%s"', scheduled.message.Id, processId)
            const err = new Error(`HashChain invalid on message ${scheduled.message.Id}`)
            err.status = 422
            throw err
          }
        }

        expectedNonce = expectedNonce + 1
        prevAssignmentId = scheduled.assignmentId
        prevHashChain = scheduled.message['Hash-Chain']

        yield scheduled
      }
    }
  }

  return (args) => Promise.resolve(args)
    .then(({
      suUrl, processId, block: processBlock, owner: processOwner, tags: processTags,
      moduleId, moduleOwner, moduleTags, fromOrdinate, toOrdinate, assignmentId, hashChain,
      isColdStart, body
    }) => {
      return [
        Readable.from(fetchAllPages({ suUrl, processId, isColdStart, from: fromOrdinate, to: toOrdinate, body })()),
        Transform.from(mapAoMessage({
          processId,
          processBlock,
          assignmentId,
          hashChain,
          from: fromOrdinate,
          isColdStart,
          processOwner,
          processTags,
          moduleId,
          moduleOwner,
          moduleTags,
          logger
        }))
      ]
    })
}

export const loadMessageMetaWith = ({ fetch, logger }) => {
  return async ({ suUrl, processId, messageUid, body }) => {
    const params = toParams({ processId, to: messageUid, from: messageUid, pageSize: 1 })

    return backoff(
      () => {
        const bodyIsValid = body &&
          body.edges.length === 1 &&
          +body.edges[0]?.node?.assignment?.Tags?.find(t => t.name === 'Nonce' || t.name === 'Slot')?.value === +messageUid
        if (bodyIsValid) return body
        return fetch(`${suUrl}/~scheduler@1.0/schedule?${params.toString()}`).then(okRes)
      },
      { maxRetries: 5, delay: 500, log: logger, name: `loadMessageMeta(${JSON.stringify({ suUrl, processId, messageUid })})` }
    )
      .catch(async (err) => {
        logger(
          'Error Encountered when loading message meta for message "%s" to process "%s" from SU "%s"',
          messageUid, processId, suUrl
        )
        throw new Error(`Error Encountered when loading message from Scheduler Unit: ${await strFromFetchError(err)}`)
      })
      .then(resToJson)
      .then(nodeAt(0))
      .then(mapNode('message'))
      .then(applySpec({
        timestamp: path(['message', 'Timestamp']),
        nonce: path(['message', 'Nonce']),
        processId: always(processId)
      }))
  }
}
