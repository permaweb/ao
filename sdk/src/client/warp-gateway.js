import { Rejected, fromPromise, of } from 'hyper-async'
import { always, append, evolve, filter, pipe } from 'ramda'
import { Buffer } from 'buffer'

export function deployContractWith ({ fetch, WARP_GATEWAY_URL, logger: _logger }) {
  const logger = _logger.child('deployContract')

  const replaceContentTypeTag = pipe(
    filter(tag => tag.name !== 'Content-Type'),
    append({ name: 'Content-Type', value: 'application/x.arweave-manifest+json' }),
    logger.tap('New tags being sent to Warp Gateway')
  )

  /**
   * An empty path manifests according to
   * https://github.com/ArweaveTeam/arweave/blob/master/doc/path-manifest-schema.md
   */
  const EMPTY_MANIFEST = {
    manifest: 'arweave/paths',
    version: '0.1.0',
    paths: {}
  }

  return (args) => {
    return of(args)
      .map(logger.tap('deploying bundled contract via the warp gateway %s', `${WARP_GATEWAY_URL}/gateway/contracts/deploy-bundled`))
      /**
       * The Warp Gateway requires that the Content-Type tag
       * is a 'application/x.arweave-manifest+json'
       *
       * This is a requirement of the Warp Gateway, not SmartWeave,
       * which is why this code exists here.
       *
       * Set 'data' in the data item to a valid, but empty, path manifest
       * and replace the Content-Type flag to be the value Warp Gateway expects
       */
      .map(evolve({
        data: always(EMPTY_MANIFEST),
        tags: replaceContentTypeTag
      }))
      /**
       * Sign with the provided signer
       */
      .chain(fromPromise(({ data, tags, signer }) => signer({
        data: Buffer.from(JSON.stringify(data)),
        tags
      })))
      /**
       * Upload to Warp
       */
      .chain(signedDataItem =>
        of(signedDataItem)
          .chain(fromPromise(async (signedDataItem) =>
            fetch(
            `${WARP_GATEWAY_URL}/gateway/contracts/deploy-bundled`,
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
            err => Rejected(new Error(`Error while communicating with warp gateway: ${JSON.stringify(err)}`)),
            fromPromise(
              async res => {
                if (res.ok) return res.json()
                throw new Error(`${res.status}: ${await res.text()}`)
              }
            )
          )
          .bimap(
            logger.tap('Error encountered when deploying bundled contract via the warp gateway'),
            logger.tap('Successfully deployed bundled contract via the warp gateway')
          )
          .map(res => ({ res, dataItemId: signedDataItem.id }))
      )
      .toPromise()
  }
}
