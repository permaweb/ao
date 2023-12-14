/* eslint-disable camelcase */
import { Transform, pipeline } from 'node:stream'
import { of } from 'hyper-async'
import { always, applySpec, evolve, filter, isNotNil, last, path, pathOr, pipe, prop } from 'ramda'

import { findRawTag, padBlockHeight } from '../utils.js'

export const loadMessagesWith = ({ fetch, logger: _logger, pageSize }) => {
  const logger = _logger.child('ao-su:loadMessages')

  /**
   * The cu will generate sort keys for Cron Messages that match SU sort keys,
   * but appends an additional 4th section that contains Cron-Interval information, for uniqueness.
   *
   * So in case the sortKey is a CU generated Cron Message sortKey, grab only the first 3
   * sections, dropping the potential 4th section, and use that to query the SU
   */
  function suSortKey (sortKey) {
    if (!sortKey) return sortKey
    return sortKey.split(',').slice(0, 3).join(',')
  }

  function mapBounds (args) {
    return evolve({
      from: pipe(
        padBlockHeight,
        suSortKey
      ),
      to: pipe(
        /**
         * Potentially add a comma to the end of the block height, so
         * the scheduler will include any interactions in that block
         */
        (sortKey) => {
          if (!sortKey) return sortKey
          const parts = String(sortKey).split(',')
          /**
           * Full sort key, so no need to increment
           */
          if (parts.length > 1) return parts.join(',')

          /**
           * only the block height is being used as the sort key
           * so append a ',' so that transactions in that block are included
           */
          const [height] = parts
          return `${height},`
        },
        /**
         * Still ensure the proper padding is added
         */
        padBlockHeight,
        suSortKey
      )
    })(args)
  }

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
            sortKey: path(['sort_key']),
            message: applySpec({
              id: path(['message', 'id']),
              owner: path(['owner', 'address']),
              target: path(['process_id']),
              anchor: path(['message', 'anchor']),
              from: mapFrom,
              'Forwarded-By': mapForwardedBy,
              'Forwarded-For': mapForwardedFor,
              tags: pathOr([], ['message', 'tags']),
              /**
               * SU currently has this outside of message, but we will place it inside message
               * as that seems more kosher (since its part of the message)
               */
              data: pathOr(undefined, ['data'])
            }),
            /**
             * We need the block metadata per message,
             * so that we can calculate implicit messages
             */
            block: applySpec({
              height: path(['block', 'height']),
              /**
               * SU is currently sending back timestamp in milliseconds,
               */
              timestamp: path(['block', 'timestamp'])
            }),
            AoGlobal: applySpec({
              process: always({ id: processId, owner: processOwner, tags: processTags }),
              block: applySpec({
                height: path(['block', 'height']),
                timestamp: path(['block', 'timestamp'])
              })
            })
          })
        )(edge)
      }
    }
  }

  return (args) =>
    of(args)
      .map(mapBounds)
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
  return (suUrl) => fetch(`${suUrl}/timestamp`)
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
        sortKey: res.sort_key
      }))
  }
}
