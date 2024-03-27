import Arweave from "arweave";
export { default as Arweave } from "arweave";
export { default as WarpArBundles } from "warp-arbundles";

export function init() {
  return Arweave.init({});
}
