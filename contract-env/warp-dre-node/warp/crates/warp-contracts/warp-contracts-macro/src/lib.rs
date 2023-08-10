use proc_macro::TokenStream;

mod warp_contract_macro;

#[proc_macro_attribute]
/// Macro used to mark view and write function of your contract. It takes one of two obligatory parameters: view, write.
///
/// Actual function names can be arbitrarily chosen by the user. Function signatures are fixed, however:
/// - view function takes an immutable reference to the contract state and the action object defining which 'view' to return and returns
///   generic `ViewResult` type parametrized with `View` and `Error` types
/// - write function takes the current state and action to be performed on that state and returns the modified state
///
/// Examples:
///
/// ```
/// // Below `State`, `Action`, `View` and `Error` are all user-defined types.
/// // `ViewResult` and `WriteResult` are generic types defined by the library
///
/// #[warp_contract(view)]
/// async pub fn view(state: &State, action: Action) -> ViewResult<View, Error> {
///     // calculate and return view result or error
/// }
///
/// #[warp_contract(write)]
/// async pub fn write(mut state: State, action: Action) -> WriteResult<State, Error> {
///     // apply state changes, return new state or error
/// }
///
/// ```
pub fn warp_contract(attr: TokenStream, input: TokenStream) -> TokenStream {
    warp_contract_macro::warp_contract(attr, input)
}
