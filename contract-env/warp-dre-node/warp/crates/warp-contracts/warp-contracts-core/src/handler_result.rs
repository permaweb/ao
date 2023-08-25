//! Provides generic types each contract has to use to communicate
//! outcome of contract methods, both success and error.

/// Return type for 'view' contract method
///
/// User is responsible for providing `View` and `Error` types. To use them with `#[warp_contract(view)]` macro they
/// both have to implement `Debug` and `Serialize`. This allows passing them from rust to js.
#[derive(Debug)]
pub enum ViewResult<View, Error> {
    /// returned on success - `View` contains the result
    Success(View),
    /// returned when a 'business' error occurred, The user-defined `Error` parameter is returned to the caller
    ContractError(Error),
    /// returned when an unexpected error occurred, The `String` parameter is for debugging purposes
    RuntimeError(String),
}

/// Return type for 'write' contract method
///
/// User is responsible for providing `State` and `Error` types. To use them with `#[warp_contract(write)]` macro `State`
/// have to implement:
/// -  `Clone` - to allow safe passing of a clone of state to contract method and disallow partial state changes in case an error is returned
/// - `Serialize`, `Deserialize` - to pass it both ways between js and rust
/// and `Error` have to implement `Serialize`.
///
/// Both types have to implement `Debug` to allow generic error message creation.
#[derive(Debug)]
pub enum WriteResult<State, Error> {
    /// returned on success - `State` contains the updated contract state
    Success(State),
    /// returned when a 'business' error occurred, The user-defined `Error` parameter is returned to the caller.
    ContractError(Error),
    /// returned when an unexpected error occurred, The `String` parameter is for debugging purposes
    RuntimeError(String),
}
