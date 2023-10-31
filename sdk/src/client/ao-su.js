import { Rejected, fromPromise, of } from 'hyper-async'

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} SU_URL
 *
 * @typedef RegisterProcess
 * @property { any } signedData - DataItem returned from arbundles createData
 *
 * @callback RegisterProcess
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {RegisterProcess}
 */
export function deployProcessWith ({ fetch, SU_URL, logger: _logger }) {
  const logger = _logger.child('deployProcess')

  return (args) => {
    return of(args)
      /**
       * Sign with the provided signer
       */
      .chain(fromPromise(({ data, tags, signer }) => signer({ data, tags })))
      .chain(signedDataItem =>
        of(signedDataItem)
          .chain(fromPromise(async (signedDataItem) =>
            fetch(
              `${SU_URL}/process`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                },
                body: signedDataItem.raw
              }
            )
          )).bichain(
            err => Rejected(new Error(`Error while communicating with SU: ${JSON.stringify(err)}`)),
            fromPromise(
              async res => {
                if (res.ok) return res.json()
                throw new Error(`${res.status}: ${await res.text()}`)
              }
            )
          )
          .bimap(
            logger.tap('Error encountered when deploying process via SU'),
            logger.tap('Successfully deployed process via SU')
          )
          .map(res => ({ res, processId: signedDataItem.id }))
      )
      .toPromise()
  }
}
