import { Rejected, fromPromise, of } from 'hyper-async'
import { z } from 'zod'

export const deployContractWith = ({ fetch, IRYS_NODE, logger: _logger }) => {
  const logger = _logger.child('irys:deployContract')

  const irysNode = z.enum(['node1', 'node2'], {
    errorMap: () => ({ message: 'the irys node must be \'node1\' or \'node2\'' })
  }).parse(IRYS_NODE)

  return (args) => {
    return of(args)
      .map(logger.tap('deploying bundled contract with irys to "%s"', `${irysNode}`))
      /**
       * Sign with the provided signer
       */
      .chain(fromPromise(({ data, tags, signer }) => signer({ data, tags })))
      /**
       * Upload to Irys Node
       */
      .chain((signedDataItem) =>
        of(signedDataItem)
          .chain(fromPromise(async (signedDataItem) =>
            fetch(
              `https://${IRYS_NODE}.irys.xyz/tx/arweave`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                },
                body: signedDataItem.raw
              }
            )
          ))
          .bichain(
            err => {
              console.error(err)
              return Rejected(new Error(`Error while communicating with irys: ${JSON.stringify(err)}`))
            },
            fromPromise(
              async res => {
                if (res.ok) return res.json()
                throw new Error(`${res.status}: ${await res.text()}`)
              }
            )
          )
          .bimap(
            logger.tap('Error encountered when deploying bundled contract via irys'),
            logger.tap('Successfully deployed bundled contract via irys')
          )
          /**
           * See https://docs.irys.xyz/developer-docs/irys-sdk/api/upload
           * for shape
           */
          .map(res => ({ res, contractId: res.id }))
      )
      .toPromise()
  }
}
