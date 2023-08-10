export async function handle(state, action) {
    if (action.input.function == '__init') {
        state.counter = 100;
        return { state };
    }

    if (action.input.function === 'readCounter') {
        return { result: state.counter };
    }
}