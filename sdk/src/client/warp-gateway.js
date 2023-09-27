import { fromPromise, of } from 'hyper-async'

export function deployContractWith ({ fetch, WARP_GATEWAY_URL, logger: _logger }) {
  return (signedDataItem) => {
    return of(signedDataItem)
      // { id, raw }
      .chain(fromPromise(async (signedDataItem) => {
        /**
         * Deploy a created DataItem to
         */
        const res = await fetch(
          `${WARP_GATEWAY_URL}/gateway/contracts/deploy-bundled`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Accept: 'application/json'
            },
            body: signedDataItem.raw
          }
        ).catch(err => {
          throw new Error(`Error while communicating with warp gateway: ${JSON.stringify(err)}`)
        }).then(async res => {
          if (res.ok) return res.json()
          throw new Error(`${res.status}: ${await res.text()}`)
        })

        return { res, dataItemId: signedDataItem.id }
      })).toPromise()
  }
}
