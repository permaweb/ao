use serde_json::Error;
use std::cell::RefCell;
use wasm_bindgen::prelude::*;

use crate::action::Action;
use crate::actions::balance::balance;
use crate::actions::evolve::evolve;
use crate::actions::foreign_call::foreign_call;
use crate::actions::transfer::transfer;
use crate::error::ContractError;
use crate::error::ContractError::RuntimeError;
use crate::js_imports::{Block, Contract, log, Transaction};
use crate::state::{HandlerResult, State};

/*
Note: in order do optimize communication between host and the WASM module,
we're storing the state inside the WASM module (for the time of state evaluation).
This allows to reduce the overhead of passing the state back and forth
between the host and module with each contract interaction.
In case of bigger states this overhead can be huge.
Same approach has been implemented for the AssemblyScript and Go versions.

So the flow (from the SDK perspective) is:
1. SDK calls exported WASM module function "initState" (with lastly cached state or initial state,
if cache is empty) - which initializes the state in the WASM module.
2. SDK calls "handle" function for each of the interaction.
If given interaction was modifying the state - it is updated inside the WASM module
- but not returned to host.
3. Whenever SDK needs to know the current state (eg. in order to perform
caching or to simply get its value after evaluating all of the interactions)
- it calls WASM's module "currentState" function.

The handle function by default does not return the new state -
it only updates it in the WASM module.
The handle function returns a value only in case of error
or calling a "view" function.

In the future this might also allow to enhance the inner-contracts communication
- e.g. if the execution network will store the state of the contracts - as the WASM contract module memory
- it would allow to read other contract's state "directly" from WASM module memory.
*/

// inspired by https://github.com/dfinity/examples/blob/master/rust/basic_dao/src/basic_dao/src/lib.rs#L13
thread_local! {
    static STATE: RefCell<State> = RefCell::default();
}

#[wasm_bindgen()]
pub async fn handle(interaction: JsValue) -> Option<JsValue> {
    log_tx();

    let result: Result<HandlerResult, ContractError>;
    let action: Result<Action, Error> = interaction.into_serde();

    if action.is_err() {
        // cannot pass any data from action.error here - ends up with
        // "FnOnce called more than once" error from wasm-bindgen for
        // "foreign_call" testcase.
        result = Err(RuntimeError("Error while parsing input".to_string()));
    } else {
        // not sure about clone here
        let current_state = STATE.with(|service| service.borrow().clone());

        result = match action.unwrap() {
            Action::Transfer { qty, target } => transfer(current_state, qty, target),
            Action::Balance { target } => balance(current_state, target),
            Action::Evolve { value } => evolve(current_state, value),
            Action::ForeignCall { contract_tx_id } => foreign_call(current_state, contract_tx_id).await,
        };
    }

    if result.is_ok() {
        log("Result ok");
        let handler_result = result.as_ref().ok().unwrap();

        return if let HandlerResult::NewState(state) = handler_result {
            // not sure about clone here
            STATE.with(|service| service.replace(state.clone()));
            None
        } else {
            Some(JsValue::from_serde(&result).unwrap())
        };
    } else {
        Some(JsValue::from_serde(&result).unwrap())
    }
}

fn log_tx() {
    log(&format!("Block indep_hash {}", Block::indep_hash()));
    log(&format!("Block height {}", Block::height()));
    log(&format!("Block timestamp {}", Block::timestamp()));

    log(&format!("Contract id {}", Contract::id()));
    log(&format!("Contract owner {}", Contract::owner()));

    log(&format!("Transaction id {}", Transaction::id()));
    log(&format!("Transaction owner {}", Transaction::owner()));
    log(&format!("Transaction target {}", Transaction::target()));
}


#[wasm_bindgen(js_name = initState)]
pub fn init_state(state: &JsValue) {
    log(&format!("Calling init state 2"));
    let state_parsed: State = state.into_serde().unwrap();
    log(&format!("state parsed"));

    STATE.with(|service| service.replace(state_parsed));
}

#[wasm_bindgen(js_name = currentState)]
pub fn current_state() -> JsValue {
    log(&format!("Calling current state"));

    // not sure if that's deterministic - which is very important for the execution network.
    // TODO: perf - according to docs:
    // "This is unlikely to be super speedy so it's not recommended for large payload"
    // - we should minimize calls to from_serde
    let current_state = STATE.with(|service| service.borrow().clone());
    JsValue::from_serde(&current_state).unwrap()
}


#[wasm_bindgen()]
pub fn version() -> i32 {
    return 1;
}

// workaround for now to simplify type reading without as/loader or wasm-bindgen
// 1 = assemblyscript
// 2 = rust
// 3 = go
// 4 = swift
// 5 = c
#[wasm_bindgen]
pub fn lang() -> i32 {
    return 2;
}

