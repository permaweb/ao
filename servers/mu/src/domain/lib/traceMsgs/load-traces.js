import { fromPromise, of } from 'hyper-async'
import { applySpec, map, prop } from 'ramda'

export function loadTracesWith ({ findMessageTraces }) {
  const load = fromPromise(findMessageTraces)
  return (ctx) => {
    return of(ctx)
      .chain(({ message: id, process, limit, offset }) => load({
        id,
        from: process,
        to: process,
        /**
         * Add 1, so we can determine if more traces exist
         */
        limit: limit + 1,
        offset
      }))
      .map(
        /**
         * Besides _id -> id, this is currently just a 1-1 mapping,
         * but it makes explicit that the model exposed here is explicitly
         * separate from the persistence model -- THEY SHOULD BE ALLOWED TO DIVERGE
         *
         * It just happens that they look very similar right now :)
         */
        map(applySpec({
          id: prop('_id'),
          parent: prop('parent'),
          children: prop('children'),
          spawns: prop('spawns'),
          from: prop('from'),
          to: prop('to'),
          message: prop('message'),
          trace: prop('trace'),
          tracedAt: prop('tracedAt')
        }))
      )
  }
}
