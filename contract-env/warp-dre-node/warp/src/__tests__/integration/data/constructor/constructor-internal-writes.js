export async function handle(state, action) {
    state.calls = state.calls || [];

    state.calls = [...state.calls, action.input.function]

    if (action.input.function == '__init') {
        state.caller = action.caller;
        state.caller2 = SmartWeave.caller;

        if (action.input.args.fail) {
            throw new ContractError("Fail on purpose")
        }
        state.counter = action.input.args.counter + 1;
        state.foreignContract = action.input.args.foreignContract;
    } else if (action.input.function == 'readCounter') {
        return { result: state.counter }
    }
    else if (action.input.function == 'read') {
        const result = await SmartWeave.contracts.viewContractState(state.foreignContract, { function: 'readCounter' });
        return { result };
    }

    return { state }
}