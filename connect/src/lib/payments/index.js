/**
 * getOperator - gets the operator of the node
 * getNodeBalance - gets the balance of a wallet on the Node
 */
import { of, fromPromise } from 'hyper-async'

export function getOperator (env) {
  return () => of({ URL: env.URL, fetch: env.fetch })
    .chain(getAddress)
    .toPromise()
}

export function getNodeBalance (env) {
  return () => of()
    .chain(requestBalance(env.request))
    .toPromise()
}

function requestBalance (request) {
  return fromPromise(() => request({
    method: 'GET',
    path: '/~simple-pay@1.0/balance'
  })
    .then(res => res.body))
}

function getAddress ({ URL, fetch }) {
  return fromPromise(nodeUrl => fetch(`${nodeUrl}/~meta@1.0/info/address`)
    .then(res => res.text())
    .catch(e => 'N/A')
  )(URL)
}
