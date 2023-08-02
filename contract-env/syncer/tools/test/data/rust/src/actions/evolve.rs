use crate::error::ContractError;
use crate::error::ContractError::{EvolveNotAllowed, OnlyOwnerCanEvolve};
use crate::js_imports::Transaction;
use crate::state::{HandlerResult, State};

pub fn evolve(mut state: State, value: String) -> Result<HandlerResult, ContractError> {
    match state.can_evolve {
        Some(can_evolve) => if can_evolve && state.owner == Transaction::owner() {
            state.evolve = Option::from(value);
            Ok(HandlerResult::NewState(state))
        } else {
            Err(OnlyOwnerCanEvolve)
        },
        None => Err(EvolveNotAllowed),
    }
}
