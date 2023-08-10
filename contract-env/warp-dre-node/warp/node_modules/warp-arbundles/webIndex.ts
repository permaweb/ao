import * as arbundlesSrc from './src';
const expObj = { ...arbundlesSrc };
globalThis.arbundles ??= expObj;
export * from './src/index';
export default expObj;
export const warparbundles = expObj;
