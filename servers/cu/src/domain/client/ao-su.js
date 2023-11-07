/* eslint-disable camelcase */
import { pipeline } from 'node:stream'
import { of } from 'hyper-async'
import { always, applySpec, assoc, evolve, filter, isNotNil, last, path, pathOr, pipe, prop, reduce } from 'ramda'

import { padBlockHeight } from '../lib/utils.js'

export const loadMessagesWith = ({ fetch, SU_URL, logger: _logger, pageSize }) => {
  const logger = _logger.child('ao-su:loadMessages')

  /**
   * The cu will generate sort keys for Scheduled Messages that match SU sort keys,
   * but appends an additional 4th section that contains Scheduled-Interval information, for uniqueness.
   *
   * So in case the sortKey is a CU generated Scheduled Message sortKey, grab only the first 3
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
         * the sequencer will include any interactions in that block
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
   * Returns an async generator that emits sequenced messages,
   * one at a time
   *
   * Sequenced messages are fetched a page at a time, but
   * emitted from the generator one message at a time.
   *
   * When the currently fetched page is drained, the next page is fetched
   * dynamically
   */
  function fetchAllPages ({ processId, from, to }) {
    async function fetchPage ({ from }) {
      return Promise.resolve({ from, to, limit: pageSize })
        .then(filter(isNotNil))
        .then(params => new URLSearchParams(params))
        .then((params) => fetch(`${SU_URL}/messages/${processId}?${params.toString()}`))
        .then((res) => res.json())
    }

    return async function * sequenced () {
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
        'Successfully loaded %s sequenced messages for process "%s" from "%s" to "%s"...',
        total,
        processId,
        from || 'initial',
        to || 'latest')
    }
  }

  /**
   * TODO: need to figure out what this
   */
  function mapFrom () {
    return undefined
  }

  /**
   * TODO: need to figure out what this is
   */
  function mapForwardedBy () {
    return undefined
  }

  function mapAoMessage ({ processId, processOwner }) {
    return async function * (edges) {
      for await (const edge of edges) {
        yield pipe(
          prop('node'),
          logger.tap('transforming message retrieved from the SU %o'),
          applySpec({
            sortKey: path(['sort_key']),
            message: applySpec({
              owner: path(['owner', 'address']),
              target: path(['process_id']),
              anchor: path(['message', 'anchor']),
              from: mapFrom,
              'Forwarded-By': mapForwardedBy,
              tags: pipe(
                pathOr([], ['message', 'tags']),
                // Parse into a key-value pair
                reduce((a, t) => assoc(t.name, t.value, a), {})
              )
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
              process: always({ id: processId, owner: processOwner }),
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
      .map(({ processId, owner: processOwner, from, to }) => {
        return pipeline(
          fetchAllPages({ processId, from, to }),
          mapAoMessage({ processId, processOwner }),
          (err) => {
            if (err) logger('Encountered err when mapping Sequencer Messages', err)
          }
        )
      })
      .toPromise()
}

export const loadProcessBlockWith = ({ fetch, SU_URL }) => {
  return async (processId) => {
    return fetch(`${SU_URL}/processes/${processId}`, { method: 'GET' })
      .then(res => res.json())
      .then(applySpec({
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

export const loadTimestampWith = ({ fetch, SU_URL }) => {
  return () => fetch(`${SU_URL}/timestamp`)
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

export const loadMessageMetaWith = ({ fetch, SU_URL }) => {
  return async ({ messageTxId }) => {
    return fetch(`${SU_URL}/message/${messageTxId}`, { method: 'GET' })
      .then(res => res.json())
      .then(res => ({
        processId: res.process_id,
        sortKey: res.sort_key
      }))
  }
}
