/* eslint-disable camelcase */
import { Transform, pipeline } from 'node:stream'
import { of } from 'hyper-async'
import { always, applySpec, filter, isNotNil, last, path, pathOr, pipe, prop } from 'ramda'

import { findRawTag } from '../utils.js'

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
        .then((res) => res.json())
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
              path(['node', 'cursor'])
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

  function mapFrom (node) {
    const tag = findRawTag('Forwarded-For', node.message.tags)
    /**
     * Not forwarded, so the signer is the who the message is from
     */
    if (!tag || !tag.value) return node.owner.address
    /**
     * Forwarded, so the owner is who the message was forwarded on behalf of
     * (the Forwarded-For) value
     */
    return tag.value
  }

  function mapForwardedBy (node) {
    const tag = findRawTag('Forwarded-For', node.message.tags)
    /**
     * Not forwarded by a MU, so simply not set
     */
    if (!tag) return undefined
    /**
     * Forwarded by a MU, so use the signer (the MU wallet)
     * as the Forwarded-By value
     */
    return node.owner.address
  }

  /**
   * Simply derived from the tag added by the MU, when cranking a message
   */
  function mapForwardedFor (node) {
    const tag = findRawTag('Forwarded-For', node.message.tags)
    if (!tag) return undefined
    return tag.value
  }

  function mapAoMessage ({ processId, processOwner, processTags }) {
    return async function * (edges) {
      for await (const edge of edges) {
        yield pipe(
          prop('node'),
          logger.tap('transforming message retrieved from the SU %o'),
          applySpec({
            cron: always(undefined),
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
              From: mapFrom,
              'Forwarded-By': mapForwardedBy,
              'Forwarded-For': mapForwardedFor,
              Tags: pathOr([], ['message', 'tags']),
              Epoch: path(['epoch']),
              Nonce: path(['nonce']),
              Timestamp: path(['timestamp']),
              'Block-Height': path(['block']),
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
              height: path(['block']),
              timestamp: path(['timestamp'])
            }),
            AoGlobal: applySpec({
              Process: always({ id: processId, owner: processOwner, tags: processTags })
            })
          })
        )(edge)
      }
    }
  }

  return (args) =>
    of(args)
      .map(({ suUrl, processId, owner: processOwner, tags: processTags, from, to }) => {
        return pipeline(
          fetchAllPages({ suUrl, processId, from, to }),
          Transform.from(mapAoMessage({ processId, processOwner, processTags })),
          (err) => {
            if (err) logger('Encountered err when mapping Sequencer Messages', err)
          }
        )
      })
      .toPromise()
}

export const loadProcessWith = ({ fetch }) => {
  return async ({ suUrl, processId }) => {
    return fetch(`${suUrl}/processes/${processId}`, { method: 'GET' })
      .then(res => res.json())
      .then(applySpec({
        owner: path(['owner', 'address']),
        tags: path(['tags']),
        block: applySpec({
          height: path(['block', 'height']),
          /**
           * SU is currently sending back timestamp in milliseconds,
           */
          timestamp: path(['block', 'timestamp'])
        })
      }))
  }
}

export const loadTimestampWith = ({ fetch }) => {
  return ({ suUrl, processId }) => fetch(`${suUrl}/timestamp?process-id=${processId}`)
    .then(res => res.json())
    .then(res => ({
      /**
       * TODO: SU currently sends these back as strings
       * so need to parse them to integers
       */
      timestamp: parseInt(res.timestamp),
      height: parseInt(res.block_height)
    }))
}

export const loadMessageMetaWith = ({ fetch }) => {
  return async ({ suUrl, processId, messageTxId }) => {
    return fetch(`${suUrl}/${messageTxId}?process-id=${processId}`, { method: 'GET' })
      .then(res => res.json())
      .then(res => ({
        processId: res.process_id,
        timestamp: res.timestamp
      }))
  }
}
