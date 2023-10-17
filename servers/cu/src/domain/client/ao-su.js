/* eslint-disable camelcase */

import { fromPromise, of } from 'hyper-async'
import { always, applySpec, compose, evolve, filter, isNotNil, last, map, path, pipe, pluck, prop, transduce } from 'ramda'

export const loadMessagesWith = ({ fetch, SU_URL, logger: _logger, pageSize }) => {
  const logger = _logger.child('loadSequencedMessages')

  /**
   * Pad the block height portion of the sortKey to 12 characters
   *
   * This should work to increment and properly pad any sort key:
   * - 000001257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (full Sequencer sort key)
   * - 000001257294,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (Smartweave protocol sort key)
   * - 1257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (missing padding)
   * - 1257294 (just block height)
   *
   * @param {string} sortKey - the sortKey to be padded. If the sortKey is of sufficient length, then no padding
   * is added.
   */
  function padBlockHeight (sortKey) {
    if (!sortKey) return sortKey
    const [height, ...rest] = String(sortKey).split(',')
    return [height.padStart(12, '0'), ...rest].join(',')
  }

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
        .then(map(filter(isNotNil)))
        .then(params => new URLSearchParams(params))
        .then(params => {
          logger(
            'Loading messages page of size %s for process %s from %s to $s',
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
              // { message, block, owner, sort_key, process_id }
              compose(
                map(applySpec({
                  sortKey: path(['sort_key']),
                  message: applySpec({
                    /**
                     * TODO: Confirm these paths
                     */
                    owner: path(['owner', 'address']),
                    target: path('process_id'),
                    anchor: path(['message', 'anchor']),
                    from: mapFrom,
                    'Forwarded-By': mapForwardedBy,
                    tags: path(['message', 'tags'])
                  }),
                  /**
                   * We need the block metadata per message,
                   * so that we can calculate implicit messages
                   */
                  block: applySpec({
                    height: path(['block', 'height']),
                    timestamp: pipe(
                      path(['block', 'timestamp']),
                      /**
                       * SU is currently sending back timestamp in milliseconds,
                       * when we actually need Epoch time,
                       *
                       * so we divide by 1000 to get Epoch time
                       */
                      inMillis => Math.floor(inMillis / 1000)
                    )
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
    .then(res => new Date(res.text()))
}
