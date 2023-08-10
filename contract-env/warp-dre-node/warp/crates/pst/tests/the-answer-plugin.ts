import { WarpPlugin, WarpPluginType } from '../../../lib/types';

// complicated logic of our plugin
const theAnswer = () => 42;
const multiplyTheAnswer = (multiplier: number) => multiplier * theAnswer();
const concatenateTheAnswer = (prefix: string) => prefix + theAnswer();
const wrapTheAnswer = (context: unknown) => {
  return { answer: theAnswer(), context };
};

// ugly rust imports
const rustImports = (helpers) => {
  return {
    __wbg_theAnswer: typeof theAnswer == 'function' ? theAnswer : helpers.notDefined('theAnswer'),
    __wbg_multiplyTheAnswer:
      typeof multiplyTheAnswer == 'function' ? multiplyTheAnswer : helpers.notDefined('multiplyTheAnswer'),
    __wbg_concatenateTheAnswer: function () {
      return helpers.logError(function (arg0, arg1, arg2) {
        try {
          const ret = concatenateTheAnswer(helpers.getStringFromWasm0(arg1, arg2));
          const ptr0 = helpers.passStringToWasm0(
            ret,
            helpers.wasm().__wbindgen_malloc,
            helpers.wasm().__wbindgen_realloc
          );
          const len0 = helpers.WASM_VECTOR_LEN();
          helpers.getInt32Memory0()[arg0 / 4 + 1] = len0;
          helpers.getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        } finally {
          helpers.wasm().__wbindgen_free(arg1, arg2);
        }
        // eslint-disable-next-line
      }, arguments);
    },
    wrapTheAnswer
  };
};

export class TheAnswerExtension implements WarpPlugin<unknown, void> {
  process(input): void {
    // pick our namespace and expose our plugin logic to JS contracts
    input.theAnswer = {
      theAnswer,
      multiplyTheAnswer,
      concatenateTheAnswer,
      wrapTheAnswer,
      // the following line effectively exposes your glue code imports to WASM module
      rustImports
    };
  }

  type(): WarpPluginType {
    return 'smartweave-extension-the-answer';
  }
}
