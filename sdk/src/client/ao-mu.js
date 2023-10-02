import { Rejected, fromPromise, of } from 'hyper-async'

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} MU_URL
 *
 * @typedef WriteInteractionTx
 * @property { any } signedData - DataItem returned from arbundles createData
 *
 * @typedef WriteInteraction2Args
 * @property {WriteInteractionTx} transaction
 *
 * @callback WriteInteraction2
 * @param {WriteInteraction2Args} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {WriteInteraction2}
 */
export function deployInteractionWith ({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('writeInteraction')

  return (args) => {
    return of(args)
      /**
       * Sign with the provided signer
       * and attach to context
       */
      .chain(
        args => of(args)
          .chain(fromPromise(({ data, tags, signer }) => signer({ data, tags })))
          .map(signedDataItem => ({ contractId: args.contractId, signedDataItem }))
      )
      .chain(({ contractId, signedDataItem }) =>
        of({ contractId, signedDataItem })
          .chain(fromPromise(async ({ contractId, signedDataItem }) =>
            fetch(
              `${MU_URL}/write`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                body: JSON.stringify({
                  cid: contractId,
                  txid: signedDataItem.id,
                  data: signedDataItem.raw
                })
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
            logger.tap('Error encountered when writing interaction via MU'),
            logger.tap('Successfully wrote interaction via MU')
          )
          /**
           * See https://github.com/warp-contracts/gateway/blob/a1192869de24426a973465cf5be0a37b27a4c5ff/src/gateway/router/routes/deployContractRoute_v2.ts#L146
           * for shape
           */
          .map(res => ({ res, interactionId: signedDataItem.id }))
      )
      .toPromise()
  }
}
