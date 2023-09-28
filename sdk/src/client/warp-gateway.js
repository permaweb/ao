import { Rejected, fromPromise, of } from 'hyper-async'

export function deployContractWith ({ fetch, WARP_GATEWAY_URL, logger: _logger }) {
  return (signedDataItem) => {
    return of(signedDataItem)
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
      .map(res => ({ res, dataItemId: signedDataItem.id }))
      .toPromise()
  }
}
