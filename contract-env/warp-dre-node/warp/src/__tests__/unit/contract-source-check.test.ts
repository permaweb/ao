import { checkJsSrc } from '../../core/modules/impl/normalize-source';

const BAD_SRC = [
  `
   "use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
function handle() {
}
exports.handle = handle; 
  `,
  `
  var library = function(exports) {
  "use strict";
  function handle() {
  }
  exports.handle = handle;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
  `,
  `
  function handle() {
}
export {
  handle
};
  `,
  `
  ;(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
    ? define(["exports"], factory)
    : ((global =
        typeof globalThis !== "undefined" ? globalThis : global || self),
      factory((global.library = {})))
})(this, function (exports2) {
  "use strict"
  function handle() {}
  exports2.handle = handle
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" })
})
  `,
  `
  (function(factory) {
  typeof define === "function" && define.amd ? define(factory) : factory();
})(function() {
  "use strict";
  function handle() {
  }
});
  `,
  `
  export async function hanle(){}
  `,
  `
  function handdle(){}
  `
];

describe('Naive js src checker', () => {
  it('should return false for wrong sources', async () => {
    for (const badSrc of BAD_SRC) {
      expect(checkJsSrc(badSrc)).toBeFalsy();
    }
  });
});
