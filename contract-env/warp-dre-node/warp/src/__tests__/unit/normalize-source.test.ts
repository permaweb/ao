import { normalizeContractSource } from '../../core/modules/impl/normalize-source';

describe('normalizeContractSource function', () => {
  const exampleSrcIIFEArrow = `(() => {
      function handle(state, action) {
      }
    })();`;

  const exampleSrcIIFEArrowWeirdFormatting = `( ()    =>  {
      function handle(state, action) {
      }
    } )  () ;`;

  const exampleSrcIIFE = `(function() {
      function handle(state, action) {
      }
    })();`;

  const exampleSrcIIFEWeirdFormatting = `(   function ()   {
      function handle(state, action) {
      }
    } )   ()  ;`;

  it('should remove IIFE written as arrow functions', () => {
    expect(normalizeContractSource(exampleSrcIIFEArrow, false)).toEqual(
      '\n' +
        '    const window=void 0,document=void 0,Function=void 0,eval=void 0,globalThis=void 0;\n' +
        '    const [SmartWeave, BigNumber, logger] = arguments;\n' +
        "    class ContractError extends Error { constructor(message) { super(message); this.name = 'ContractError' } };\n" +
        '    function ContractAssert(cond, message) { if (!cond) throw new ContractError(message) };\n' +
        '          function handle(state, action) {\n' +
        '      };\n' +
        '    return handle;\n' +
        '  '
    );

    expect(normalizeContractSource(exampleSrcIIFEArrowWeirdFormatting, false)).toEqual(
      '\n' +
        '    const window=void 0,document=void 0,Function=void 0,eval=void 0,globalThis=void 0;\n' +
        '    const [SmartWeave, BigNumber, logger] = arguments;\n' +
        "    class ContractError extends Error { constructor(message) { super(message); this.name = 'ContractError' } };\n" +
        '    function ContractAssert(cond, message) { if (!cond) throw new ContractError(message) };\n' +
        '          function handle(state, action) {\n' +
        '      };\n' +
        '    return handle;\n' +
        '  '
    );
  });

  it('should remove IIFE written as standard functions', () => {
    expect(normalizeContractSource(exampleSrcIIFE, false)).toEqual(
      '\n' +
        '    const window=void 0,document=void 0,Function=void 0,eval=void 0,globalThis=void 0;\n' +
        '    const [SmartWeave, BigNumber, logger] = arguments;\n' +
        "    class ContractError extends Error { constructor(message) { super(message); this.name = 'ContractError' } };\n" +
        '    function ContractAssert(cond, message) { if (!cond) throw new ContractError(message) };\n' +
        '          function handle(state, action) {\n' +
        '      };\n' +
        '    return handle;\n' +
        '  '
    );

    expect(normalizeContractSource(exampleSrcIIFEWeirdFormatting, false)).toEqual(
      '\n' +
        '    const window=void 0,document=void 0,Function=void 0,eval=void 0,globalThis=void 0;\n' +
        '    const [SmartWeave, BigNumber, logger] = arguments;\n' +
        "    class ContractError extends Error { constructor(message) { super(message); this.name = 'ContractError' } };\n" +
        '    function ContractAssert(cond, message) { if (!cond) throw new ContractError(message) };\n' +
        '          function handle(state, action) {\n' +
        '      };\n' +
        '    return handle;\n' +
        '  '
    );
  });
});
