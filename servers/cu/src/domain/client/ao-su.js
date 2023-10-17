import { fromPromise, of } from 'hyper-async'
import { always, applySpec, compose, defaultTo, filter, isNotNil, map, path, pipe, prop, transduce } from 'ramda'

export const loadMessagesWith = ({ fetch, SU_URL, logger: _logger }) => {
  const logger = _logger.child('loadSequencedMessages')

  function buildParams ({ to, from }) {
    return of({ to, from })
      .map(filter(isNotNil))
      .map(params => new URLSearchParams(params))
  }

  function toAoGlobal ({ process: { id, owner } }) {
    return (message) => applySpec({
      process: always({ id, owner }),
      block: applySpec({
        height: path(['block', 'height']),
        timestamp: path(['block', 'timestamp'])
      })
    })(message)
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

  return ({ processId, owner: processOwner, from, to }) =>
    of({ processId, processOwner, from, to })
      .chain(buildParams)
      .chain(fromPromise((params) => {
        return fetch(`${SU_URL}/messages/${processId}?${params.toString()}`)
          // TODO: need to verify with Vince shape of the response
          .then(res => res.json())
          // TODO: do we need this defaultTo? Keeping to be safe for now
          .then(defaultTo([]))
          .then(sequence => {
            logger(
              'loaded sequence of length %s from the su for process %s from sortKey %s to sortKey %s',
              sequence.length,
              processId,
              from || 'initial',
              to || 'latest'
            )
            return sequence
          })
          .then(messages =>
            transduce(
              compose(
                map(applySpec({
                  owner: prop('owner'),
                  target: prop('target'),
                  anchor: prop('anchor'),
                  from: mapFrom,
                  'Forwarded-By': mapForwardedBy,
                  tags: prop('tags'),
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
                  AoGlobal: toAoGlobal({ process: { id: processId, owner: processOwner } })
                }))
              ),
              (acc, message) => {
                acc.unshift(message)
                return acc
              },
              [],
              messages
            )
          )
      }))
      .toPromise()
}

export const loadTimestampWith = ({ fetch, SU_URL }) => {
  return () => fetch(`${SU_URL}/timestamp`)
    .then(res => new Date(res.text()))
}
