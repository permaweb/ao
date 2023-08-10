"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkJsSrc = exports.normalizeContractSource = void 0;
const utils_1 = require("../../../utils/utils");
function normalizeContractSource(contractSrc, useVM2) {
    // Convert from ES Module format to something we can run inside a Function.
    // Removes the `export` keyword and adds ;return handle to the end of the function.
    // Additionally it removes 'IIFE' declarations
    // (which may be generated when bundling multiple sources into one output file
    // - eg. using esbuild's "IIFE" bundle format).
    // We also assign the passed in SmartWeaveGlobal to SmartWeave, and declare
    // the ContractError exception.
    // We then use `new Function()` which we can call and get back the returned handle function
    // which has access to the per-instance globals.
    const lines = contractSrc.trim().split('\n');
    const first = lines[0];
    const last = lines[lines.length - 1];
    if ((/\(\s*\(\)\s*=>\s*{/g.test(first) || /\s*\(\s*function\s*\(\)\s*{/g.test(first)) &&
        /}\s*\)\s*\(\)\s*;/g.test(last)) {
        lines.shift();
        lines.pop();
        contractSrc = lines.join('\n');
    }
    contractSrc = contractSrc
        .replace(/export\s+async\s+function\s+handle/gmu, 'async function handle')
        .replace(/export\s+function\s+handle/gmu, 'function handle');
    if (useVM2) {
        return `
    ${contractSrc}
    module.exports = handle;`;
    }
    else {
        return `
    const window=void 0,document=void 0,Function=void 0,eval=void 0,globalThis=void 0;
    const [SmartWeave, BigNumber, logger${(0, utils_1.isBrowser)() ? ', Buffer, atob, btoa' : ''}] = arguments;
    class ContractError extends Error { constructor(message) { super(message); this.name = 'ContractError' } };
    function ContractAssert(cond, message) { if (!cond) throw new ContractError(message) };
    ${contractSrc};
    return handle;
  `;
    }
}
exports.normalizeContractSource = normalizeContractSource;
function checkJsSrc(src, logger) {
    try {
        const normalizedSource = normalizeContractSource(src, false);
        new Function(normalizedSource)();
        return true;
    }
    catch (e) {
        logger === null || logger === void 0 ? void 0 : logger.error(e);
        return false;
    }
}
exports.checkJsSrc = checkJsSrc;
//# sourceMappingURL=normalize-source.js.map