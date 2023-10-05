import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { NodeIrys as _NodeIrys } from '@irys/sdk'

export const deployContractWith = ({ IRYS_NODE, logger: _logger, NodeIrys = _NodeIrys }) => {
  const logger = _logger.child('irys:deployContract')

  const irysNode = z.enum(['node1', 'node2'], {
    errorMap: () => ({ message: 'the irys node must be \'node1\' or \'node2\'' })
  }).parse(IRYS_NODE)

  return (args) => {
    return of(args)
      .map(logger.tap('deploying bundled contract with irys to node %s', `${irysNode}`))
      /**
       * Upload to Irys Node
       */
      .chain((args) =>
        of(args)
          .chain(fromPromise(async ({ data, tags, signer }) =>
            new NodeIrys({
              url: irysNode,
              token: 'arweave',
              /**
               * The signer is unused by the irysClient since it handles
               * signing, internally, so we simply grab the wallet off of
               * signer function to pass to the Irys client
               */
              key: signer._()
            })
              .upload(data, { tags })
          ))
          .bichain(
            err => Rejected(new Error(`Error while communicating with irys: ${JSON.stringify(err)}`)),
            Resolved
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
