"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = void 0;
/**
 * Executes a single interaction against the contract source code and state, and
 * returns the new state, or 'false' if there was an error.
 *
 * Callers should replay all interactions in the correct order to get the correct
 * state to execute against.
 *
 * @param contractSrc   the source code of the contract
 * @param input         the input interaction, should be a plain Js object
 * @param state         the current state of the contract
 * @param caller        the wallet address of the caller who is interacting with the contract
 */
function execute(handler, interaction, state) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stateCopy = JSON.parse(JSON.stringify(state));
            const result = yield handler(stateCopy, interaction);
            if (result && (result.state || result.result)) {
                return {
                    type: 'ok',
                    result: result.result,
                    state: result.state || state,
                };
            }
            // Will be caught below as unexpected exception.
            throw new Error(`Unexpected result from contract: ${JSON.stringify(result)}`);
        }
        catch (err) {
            if (err.name === 'ContractError') {
                return {
                    type: 'error',
                    result: err.message,
                    state,
                };
            }
            return {
                type: 'exception',
                result: `${(err && err.stack) || (err && err.message)}`,
                state,
            };
        }
    });
}
exports.execute = execute;
