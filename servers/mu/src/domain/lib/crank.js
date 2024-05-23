import { of, fromPromise } from 'hyper-async'

export function crankWith ({ logger, enqueuResults }) {
  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(enqueuResults))
      .map(logger.tap('Cranked msgs'))
  }
}
