export async function handle(state, action) {
    state.calls = state.calls || [];

    state.calls = [...state.calls, action.input.function]

    if (action.input.function == '__init') {
        state.caller = action.caller;
        state.caller2 = SmartWeave.caller;
        await SmartWeave.kv.put("__init", 'Welcome to kv');

        state.counter = action.input.args.counter + 1;

        if (action.input.args.fail) {
            throw new ContractError("Fail on purpose")
        }

        if (action.input.args.accessBlock) {
            SmartWeave.block.timestamp;
        }

        if (action.input.args.accessVrf) {
            SmartWeave.vrf.data;
        }

        if (action.input.args.accessTx) {
            SmartWeave.transaction.id;
        }
    }

    if (action.input.function == 'callMe') {
        await SmartWeave.kv.put("okey", "okey");
        return {
            state: {
                ...state,
                blockId: SmartWeave.block.height,
                txId: SmartWeave.transaction.id,
                vrf: SmartWeave.vrf.data
            }
        }
    }

    return { state }
}