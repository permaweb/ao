import { of, fromPromise, Rejected } from 'hyper-async'

export function topUpWith ({ fetch, logger, RELAY_URL }) {
  return async ({ ctx, logId }) => {
    return of(ctx)
      .map(logger.tap({ log: `Forwarding message to RELAY ${RELAY_URL}`, logId }))
      // .chain(
      //   fromPromise((body) =>
      //     fetch(RELAY_URL, {
      //       method: 'POST',
      //       headers: {
      //         'Content-Type': 'application/octet-stream',
      //         Accept: 'application/json'
      //       },
      //       redirect: 'manual',
      //       body
      //     }).then(async (response) => {
      //       return response
      //     })
      //   )
      // )
      .toPromise()
  }
}