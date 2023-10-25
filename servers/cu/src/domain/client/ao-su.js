/* eslint-disable camelcase */

import { fromPromise, of } from 'hyper-async'
import { always, applySpec, assoc, compose, evolve, filter, isNotNil, last, map, path, pathOr, pipe, pluck, prop, reduce, transduce } from 'ramda'

import { padBlockHeight } from '../lib/utils.js'

export const loadMessagesWith = ({ fetch, SU_URL, logger: _logger, pageSize }) => {
  const logger = _logger.child('ao-su:loadMessages')

  function mapBounds (args) {
    return evolve({
      from: padBlockHeight,
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
        padBlockHeight
      )
    })(args)
  }

  async function fetchAllPages ({ processId, from, to }) {
    async function fetchPage ({ from: newFrom }) {
      // deno-fmt-ignore-start
      return Promise.resolve({ from: newFrom, to, limit: pageSize })
        .then(filter(isNotNil))
        .then(params => new URLSearchParams(params))
        .then(params => {
          logger(
            'Loading messages page of size %s for process %s from %s to %s',
            pageSize,
            processId,
            newFrom || 'initial',
            to || 'latest'
          )
          return params
        })
        .then((params) => fetch(`${SU_URL}/messages/${processId}?${params.toString()}`))
        .then((res) => res.json())
    }

    async function maybeFetchNext ({ page_info, edges }) {
      /**
       * Either have reached the end and resolve,
       * or fetch the next page and recurse
       */
      return !page_info.has_next_page
        ? { page_info, edges }
        : Promise.resolve({
          /**
           * The next page will start on the next block
           */
          from: pipe(
            last,
            path(['node', 'cursor'])
          )(edges)
        })
          .then(fetchPage)
          .then(maybeFetchNext)
          .then(({ page_info, edges: e }) => ({ page_info, edges: edges.concat(e) }))
    }

    /**
     * Start with the first page, then keep going
     */
    return fetchPage({ from }).then(maybeFetchNext)
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

  function mapAoGlobal ({ process: { id, owner } }) {
    return (message) => applySpec({
      process: always({ id, owner }),
      block: applySpec({
        height: path(['block', 'height']),
        timestamp: path(['block', 'timestamp'])
      })
    })(message)
  }

  return (args) =>
    of(args)
      .map(mapBounds)
      .chain(fromPromise(({ processId, owner: processOwner, from, to }) => {
        return fetchAllPages({ processId, from, to })
          .then(prop('edges'))
          .then(pluck('node'))
          .then(nodes =>
            transduce(
              /**
               * fields from SU are currently snake_case,
               * so we need to map from those
               */
              // { message, block, owner, sort_key, process_id }
              compose(
                map(logger.tap('transforming message retrieved from the SU')),
                map(applySpec({
                  sortKey: path(['sort_key']),
                  message: applySpec({
                    owner: path(['owner', 'address']),
                    target: path(['process_id']),
                    anchor: path(['message', 'anchor']),
                    /**
                     * TODO: implement from and Forwarded-By
                     */
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
                  AoGlobal: mapAoGlobal({ process: { id: processId, owner: processOwner } })
                }))
              ),
              (acc, message) => {
                acc.push(message)
                return acc
              },
              [],
              nodes
            )
          )
      }))
      .toPromise()
}

export const loadTimestampWith = ({ fetch, SU_URL }) => {
  return () => fetch(`${SU_URL}/timestamp`)
    .then(res => res.json())
    .then(res => ({
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
