/* eslint-disable camelcase */
import { Transform, compose as composeStreams } from 'node:stream'
import { of } from 'hyper-async'
import { always, applySpec, filter, isNotNil, last, path, pathOr, pipe, prop } from 'ramda'

import { mapForwardedBy, mapFrom } from '../utils.js'

export const loadMessagesWith = ({ fetch, logger: _logger, pageSize }) => {
  const logger = _logger.child('ao-su:loadMessages')

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
  function fetchAllPages ({ suUrl, processId, from, to }) {
    async function fetchPage ({ from }) {
      return Promise.resolve({ 'process-id': processId, from, to, limit: pageSize })
        .then(filter(isNotNil))
        .then(params => new URLSearchParams(params))
        .then((params) => fetch(`${suUrl}/${processId}?${params.toString()}`))
        .then(async (res) => {
          if (res.ok) return res.json()
          logger(
            'Error Encountered when fetching page of scheduled messages from SU \'%s\' for process \'%s\' between \'%s\' and \'%s\'',
            suUrl,
            processId,
            from,
            to
          )
          throw new Error(`${res.status}: ${await res.text()}`)
        })
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
              'Loading next page of maximum %s messages for process %s from %s to %s',
              pageSize,
              processId,
              from || 'initial',
              to || 'latest'
            )
            return fetchPage({ from: curFrom })
          })
          .then(({ page_info, edges }) => {
            total += edges.length
            curPage = edges
            hasNextPage = page_info.has_next_page
            curFrom = page_info.has_next_page && pipe(
              last,
              path(['cursor'])
            )(edges)
          })

        while (curPage.length) yield curPage.shift()
      }

      logger(
        'Successfully loaded %s scheduled messages for process "%s" from "%s" to "%s"...',
        total,
        processId,
        from || 'initial',
        to || 'latest')
    }
  }

  function mapNodeFrom (node) {
    return mapFrom({ tags: node.message.tags, owner: node.owner.address })
  }

  function mapNodeForwardedBy (node) {
    return mapForwardedBy({ tags: node.message.tags, owner: node.owner.address })
  }

  function mapName (node) {
    return `Scheduled Message ${node.message.id} ${node.timestamp}:${node.nonce}`
  }

  function mapAoMessage ({ processId, processOwner, processTags, moduleId, moduleOwner, moduleTags }) {
    return async function * (edges) {
      for await (const edge of edges) {
        yield pipe(
          prop('node'),
          (node) => {
            logger('Transforming Scheduled Message "%s" to process "%s"', node.message.id, processId)
            return node
          },
          applySpec({
            cron: always(undefined),
            /**
             * Set the ordinate to the message's nonce value
             */
            ordinate: path(['nonce']),
            name: mapName,
            message: applySpec({
              Id: path(['message', 'id']),
              Signature: path(['message', 'signature']),
              /**
               * SU currently has this outside of message, but we will place it inside message
               * as that seems more kosher (since its part of the message)
               */
              Data: pathOr(undefined, ['data']),
              Owner: path(['owner', 'address']),
              Target: path(['process_id']),
              Anchor: path(['message', 'anchor']),
              From: mapNodeFrom,
              'Forwarded-By': mapNodeForwardedBy,
              Tags: pathOr([], ['message', 'tags']),
              Epoch: path(['epoch']),
              Nonce: path(['nonce']),
              Timestamp: path(['timestamp']),
              'Block-Height': pipe(
                /**
                 * Returns a left padded integer like '000001331218'
                 *
                 * So use parseInt to convert it into a number
                 */
                path(['block']),
                (str) => parseInt(`${str}`)
              ),
              'Hash-Chain': path(['hash_chain']),
              Cron: always(false)
            }),
            /**
             * We need the block metadata per message,
             * so that we can calculate cron messages
             *
             * Separating them here, makes it easier to access later
             * down the pipeline
             */
            block: applySpec({
              height: pipe(
                path(['block']),
                (block) => parseInt(block)
              ),
              timestamp: path(['timestamp'])
            }),
            AoGlobal: applySpec({
              Process: always({ Id: processId, Owner: processOwner, Tags: processTags }),
              Module: always({ Id: moduleId, Owner: moduleOwner, Tags: moduleTags })
            })
          })
        )(edge)
      }
    }
  }

  return (args) =>
    of(args)
      .map(({ suUrl, processId, owner: processOwner, tags: processTags, moduleId, moduleOwner, moduleTags, from, to }) => {
        return composeStreams(
          /**
           * compose will convert the AsyncIterable into a readable Duplex
           */
          fetchAllPages({ suUrl, processId, from, to })(),
          Transform.from(mapAoMessage({ processId, processOwner, processTags, moduleId, moduleOwner, moduleTags }))
        )
      })
      .toPromise()
}

export const loadProcessWith = ({ fetch, logger }) => {
  return async ({ suUrl, processId }) => {
    return fetch(`${suUrl}/processes/${processId}`, { method: 'GET' })
      .then(async (res) => {
        if (res.ok) return res.json()
        logger('Error Encountered when loading process "%s" from SU "%s"', processId, suUrl)
        throw new Error(`${res.status}: ${await res.text()}`)
      })
      .then(applySpec({
        owner: path(['owner', 'address']),
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
        })
      }))
  }
}

export const loadTimestampWith = ({ fetch, logger }) => {
  return ({ suUrl, processId }) => fetch(`${suUrl}/timestamp?process-id=${processId}`)
    .then(async (res) => {
      if (res.ok) return res.json()
      logger('Error Encountered when loading timestamp for process "%s" from SU "%s"', processId, suUrl)
      throw new Error(`${res.status}: ${await res.text()}`)
    })
    .then(res => ({
      /**
       * TODO: SU currently sends these back as strings
       * so need to parse them to integers
       */
      timestamp: parseInt(res.timestamp),
      height: parseInt(res.block_height)
    }))
}

export const loadMessageMetaWith = ({ fetch, logger }) => {
  return async ({ suUrl, processId, messageTxId }) => {
    return fetch(`${suUrl}/${messageTxId}?process-id=${processId}`, { method: 'GET' })
      .then(async (res) => {
        if (res.ok) return res.json()
        logger(
          'Error Encountered when loading message meta for message "%s" to process "%s" from SU "%s"',
          messageTxId, processId, suUrl
        )
        throw new Error(`${res.status}: ${await res.text()}`)
      })
      .then((res) => ({
        processId: res.process_id,
        timestamp: res.timestamp,
        nonce: res.nonce
      }))
  }
}
