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
export function registerProcessWith ({ fetch, SU_URL, logger: _logger }) {
  const logger = _logger.child('deployMessage')

  return (args) => {
    return of(args)
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
          .map(res => ({ res }))
      )
      .toPromise()
  }
}
