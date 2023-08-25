use crate::error::ContractError;
use crate::error::ContractError::WalletHasNoBalanceDefined;
use crate::js_imports::log;
use crate::state::{HandlerResult, State};

pub fn balance(state: State, target: String) -> Result<HandlerResult, ContractError> {
    log(&format!("Balance called {}", target));

    for (key, value) in &state.balances {
        log(&format!("{}: {}", key, value));
    }

    if !state.balances.contains_key(&target) {
        Err(WalletHasNoBalanceDefined(target))
    } else {
        Ok(HandlerResult::Balance(*state.balances.get(&target).unwrap()))
    }
}
