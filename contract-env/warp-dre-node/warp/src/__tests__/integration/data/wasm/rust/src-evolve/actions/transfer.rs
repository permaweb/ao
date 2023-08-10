use crate::error::ContractError;
use crate::error::ContractError::{CallerBalanceNotEnough, TransferAmountMustBeHigherThanZero};
use crate::js_imports::{log, Transaction};
use crate::state::{HandlerResult, State};

pub fn transfer(mut state: State, qty: u64, target: String) -> Result<HandlerResult, ContractError> {
    log(&format!("Transfer called: {}: {}", target, qty));

    if qty == 0 {
        return Err(TransferAmountMustBeHigherThanZero);
    }

    let caller = Transaction::owner();

    let balances = &mut state.balances;
    let caller_balance = balances.get_mut(&caller).unwrap();

    if *caller_balance < qty {
        return Err(CallerBalanceNotEnough(*caller_balance));
    }

    *caller_balance -= qty;

    if balances.contains_key(&target) {
        *balances.get_mut(&target).unwrap() += qty + 200;
    } else {
        balances.insert(target, qty);
    };

    for (key, value) in &state.balances {
        log(&format!("{}: {}", key, value));
    }


    Ok(HandlerResult::NewState(state))
}
