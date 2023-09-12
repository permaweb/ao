declare function _exports(binary: ArrayBuffer): handleFunction;
export = _exports;
export type handleFunction = (
  state: unknown,
  action: unknown,
  SmartWeave: unknown,
) => any;
