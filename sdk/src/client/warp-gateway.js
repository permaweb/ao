import { Rejected, fromPromise, of } from 'hyper-async'

export function deployContractWith ({ fetch, WARP_GATEWAY_URL, logger: _logger }) {
  const logger = _logger.child('deployContract')

  return (signedDataItem) => {
    return of(signedDataItem)
      .map(logger.tap('deploying bundled contract via the warp gateway %s', `${WARP_GATEWAY_URL}/gateway/contracts/deploy-bundled`))
      // { id, raw }
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
      .toPromise()
  }
}
