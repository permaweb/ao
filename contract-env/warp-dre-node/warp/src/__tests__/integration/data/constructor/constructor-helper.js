export async function handle(state, action) {
    if (action.input.function == '__init') {
        state.counter = 100;
        await SmartWeave.contracts.write(action.input.args.foreignContract, { function: 'write' });
        return { state };
    }

    if (action.input.function == 'write') {
        state.counter = (state.counter || 0) + 1;
        return { state }
    }
}