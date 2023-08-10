import { isBrowser } from '../../../utils/utils';
import { WarpLogger } from '../../../logging/WarpLogger';

export function normalizeContractSource(contractSrc: string, useVM2: boolean): string {
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

  if (
    (/\(\s*\(\)\s*=>\s*{/g.test(first) || /\s*\(\s*function\s*\(\)\s*{/g.test(first)) &&
    /}\s*\)\s*\(\)\s*;/g.test(last)
  ) {
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
  } else {
    return `
    const window=void 0,document=void 0,Function=void 0,eval=void 0,globalThis=void 0;
    const [SmartWeave, BigNumber, logger${isBrowser() ? ', Buffer, atob, btoa' : ''}] = arguments;
    class ContractError extends Error { constructor(message) { super(message); this.name = 'ContractError' } };
    function ContractAssert(cond, message) { if (!cond) throw new ContractError(message) };
    ${contractSrc};
    return handle;
  `;
  }
}

export function checkJsSrc(src: string, logger?: WarpLogger): boolean {
  try {
    const normalizedSource = normalizeContractSource(src, false);
    new Function(normalizedSource)();
    return true;
  } catch (e) {
    logger?.error(e);
    return false;
  }
}
