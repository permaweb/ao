import { of, fromPromise } from 'hyper-async'
/**
 * https://gw.warp.cc/gateway/v2/interactions-sort-key?contractId=SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY&limit=15&totalCount=true&page=1
 * 
 */
const GATEWAY = 'https://gw.warp.cc'

export const loadActions = ctx => of(ctx.id)
  .chain(fetchActions)

function fetchActions(contractId) {
  return fromPromise(fetch(`${GATEWAY}/gateway/v2/interactions-sort-key?contractId=${contractId}&limit=1000`)
    .then(res => res.json())
    // map and inject in to ctx.actions
  )(contractId)

}
