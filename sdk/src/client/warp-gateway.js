import { Rejected, fromPromise, of } from 'hyper-async'
import { append, evolve, filter, pipe } from 'ramda'

/**
 * Inject dependencies, so they are configurable,
 * and stubbable for testing
 */
export function deployContractWith ({ fetch, WARP_GATEWAY_URL, logger: _logger, getTime = () => new Date().getTime() }) {
  const logger = _logger.child('warp-gateway:deployContract')

  /**
   * The endpoint expects the SDK tag to be set to Warp,
   * so for now, we will overwrite the tag to what the Warp Gateway wants
   *
   * Eventually may want to submit a PR to Warp to allow SDK 'ao' 😎
   */
  const replaceSdkTag = pipe(
    filter(tag => tag.name !== 'SDK'),
    append({ name: 'SDK', value: 'Warp' }),
    logger.tap('New tags being sent to Warp Gateway')
  )

  /**
   * The Warp Gateway expects a Nonce tag, so generate one and append
   * it to the list of tags
   */
  const addNonceTag = append({ name: 'Nonce', value: `${getTime()}` })

  return (args) => {
    return of(args)
      .map(logger.tap('deploying bundled contract via the warp gateway %s', `${WARP_GATEWAY_URL}/gateway/v2/contracts/deploy`))
      .map(evolve({ tags: pipe(replaceSdkTag, addNonceTag) }))
      /**
       * Sign with the provided signer
       */
      .chain(fromPromise(({ data, tags, signer }) => signer({ data, tags })))
      /**
       * Upload to Warp
       */
      .chain(signedDataItem =>
        of(signedDataItem)
          .chain(fromPromise(async (signedDataItem) =>
            fetch(
            `${WARP_GATEWAY_URL}/gateway/v2/contracts/deploy`,
            {
              method: 'POST',
              headers: {
                'Accept-Encoding': 'gzip, deflate, br',
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify({
                contract: signedDataItem.raw
              })
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
          /**
           * See https://github.com/warp-contracts/gateway/blob/a1192869de24426a973465cf5be0a37b27a4c5ff/src/gateway/router/routes/deployContractRoute_v2.ts#L146
           * for shape
           */
          .map(res => ({ res, contractId: res.contractTxId }))
      )
      .toPromise()
  }
}
