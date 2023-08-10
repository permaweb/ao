/**
 * The input to the contract at each step. Includes
 * input and caller parsed already, the transaction
 * details, and the block information of the transaction.
 *
 */
export interface ContractInteraction {
    input: any;
    caller: string;
}
/**
 * The return value for the contracts handle() method.
 */
export interface ContractHandlerResult {
    result?: any;
    state?: any;
}
/**
 * Function type for the contracts handle() method.
 */
export declare type ContractHandler = (state: any, interaction: ContractInteraction) => ContractHandlerResult | Promise<ContractHandlerResult>;
/**
 * The end result of a single contract interaction.
 * This includes exceptions caught.
 */
export interface ContractInteractionResult {
    type: 'ok' | 'error' | 'exception';
    result: any;
    state: any;
}
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
export declare function execute(handler: ContractHandler, interaction: ContractInteraction, state: any): Promise<ContractInteractionResult>;
