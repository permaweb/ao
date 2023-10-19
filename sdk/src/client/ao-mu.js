import { Rejected, fromPromise, of } from 'hyper-async'

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} MU_URL
 *
 * @typedef WriteMessageTx
 * @property { any } signedData - DataItem returned from arbundles createData
 *
 * @typedef WriteMessage2Args
 * @property {WriteMessageTx} transaction
 *
 * @callback WriteMessage2
 * @param {WriteMessage2Args} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {WriteMessage2}
 */
export function deployMessageWith ({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('deployMessage')

  return (args) => {
    return of(args)
      /**
       * Sign with the provided signer
       * and attach to context
       */
      .chain(
        args => of(args)
          .chain(fromPromise(({ data, tags, signer }) => signer({ data, tags })))
          .map(signedDataItem => ({ processId: args.processId, signedDataItem }))
      )
      .chain(({ processId, signedDataItem }) =>
        of({ processId, signedDataItem })
          .chain(fromPromise(async ({ processId, signedDataItem }) =>
            fetch(
              `${MU_URL}/message`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                /**
                 * TODO: this should be a data item,
                 * but how to pass the:
                 *
                 * - target ie. processId
                 *
                 * is it part of the data item?
                 */
                body: signedDataItem.raw
              }
            )
          )).bichain(
            err => Rejected(new Error(`Error while communicating with MU: ${JSON.stringify(err)}`)),
            fromPromise(
              async res => {
                if (res.ok) return res.json()
                throw new Error(`${res.status}: ${await res.text()}`)
              }
            )
          )
          .bimap(
            logger.tap('Error encountered when writing message via MU'),
            logger.tap('Successfully wrote message via MU')
          )
          .map(res => ({ res, messageId: signedDataItem.id }))
      )
      .toPromise()
  }
}
