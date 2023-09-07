import { fromPromise, of } from "hyper-async";
/**
 * https://gw.warp.cc/gateway/v2/interactions-sort-key?contractId=SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY&limit=15&totalCount=true&page=1
 */
const GATEWAY = "https://gw.warp.cc";

export const loadActions = (ctx) =>
  of(ctx.id)
    .chain(fetchActions)
    .map((actions) => ({ ...ctx, actions }));

function fetchActions(contractId) {
  return fromPromise((id) =>
    fetch(
      `${GATEWAY}/gateway/v2/interactions-sort-key?contractId=${id}&limit=1000`,
    )
      .then((res) => res.json())
      .then((res) => res.interactions)
    // map and inject in to ctx.actions
  )(contractId);
}
