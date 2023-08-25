export function arrayToHex(arr: Uint8Array) {
  let str = '';
  for (const a of arr) {
    str += ('0' + a.toString(16)).slice(-2);
  }
  return str;
}
