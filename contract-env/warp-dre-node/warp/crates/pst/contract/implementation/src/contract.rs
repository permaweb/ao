use warp_pst::{
    action::{Action, PstWriteResult, PstViewResult},
    state::PstState,
};
use wasm_bindgen::prelude::wasm_bindgen;

use crate::actions::*;
use warp_contracts::{js_imports::*, warp_contract};

#[warp_contract(write)]
pub async fn handle_write(state: PstState, action: Action) -> PstWriteResult {
    console_error_panic_hook::set_once();
    let effective_caller = SmartWeave::caller();

    //Example of accessing functions imported from js:
    log("log from contract");
    log(&("Transaction::id()".to_owned() + &Transaction::id()));
    log(&("Transaction::owner()".to_owned() + &Transaction::owner()));
    log(&("Transaction::target()".to_owned() + &Transaction::target()));

    log(&("Block::height()".to_owned() + &Block::height().to_string()));
    log(&("Block::indep_hash()".to_owned() + &Block::indep_hash()));
    log(&("Block::timestamp()".to_owned() + &Block::timestamp().to_string()));

    log(&("Contract::id()".to_owned() + &Contract::id()));
    log(&("Contract::owner()".to_owned() + &Contract::owner()));

    log(&("SmartWeave::caller()".to_owned() + &SmartWeave::caller()));

    // for vrf-compatible interactions
    log(&("Vrf::value()".to_owned() + &Vrf::value()));
    log(&("Vrf::randomInt(7)".to_owned() + &Vrf::randomInt(7).to_string()));

    match action {
        Action::Transfer(action) => action.action(effective_caller, state),
        Action::Evolve(action) => action.action(effective_caller, state),
        Action::ForeignRead(action) => action.action(effective_caller, state).await,
        Action::ForeignWrite(action) => action.action(effective_caller, state).await,
        Action::KvPut(action) => action.action(effective_caller, state).await,
        _ => PstWriteResult::RuntimeError("invalid method for write".to_owned()),
    }
}

#[warp_contract(view)]
pub async fn handle_view(state: &PstState, action: Action) -> PstViewResult {
    console_error_panic_hook::set_once();
    let effective_caller = SmartWeave::caller();

    match action {
        Action::Balance(action) => action.action(effective_caller, state),
        Action::ForeignView(action) => action.action(effective_caller, state).await,
        Action::KvGet(action) => action.action(effective_caller, state).await,
        _ => PstViewResult::RuntimeError("invalid method for view".to_owned()),
    }
}
