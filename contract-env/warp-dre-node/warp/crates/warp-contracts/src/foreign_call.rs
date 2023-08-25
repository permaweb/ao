//! Type safe wrappers over <https://docs.warp.cc/docs/sdk/basic/smartweave-global> API

use super::js_imports::SmartWeave;
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_wasm_bindgen::from_value;
use core::fmt::Debug;
use warp_contracts_core::{
    handler_result::{ViewResult, WriteResult},
    methods::to_json_value,
    warp_result::{transmission::from_json, WarpResult},
};

/// returns the current state (`Ok(State)`) of contract identified ty `contract_address` or `Err(String)` in case of runtime error
pub async fn read_foreign_contract_state<T: DeserializeOwned>(
    contract_address: &str,
) -> Result<T, String> {
    match SmartWeave::read_contract_state(contract_address).await {
        Ok(s) => match from_value::<T>(s) {
            Ok(v) => Ok(v),
            Err(e) => Err(format!("{e:?}")),
        },
        Err(e) => Err(format!("{e:?}")),
    }
}

/// returns the 'view' identified by `input` on the current state of the contract identified by `contract_address`
pub async fn view_foreign_contract_state<
    V: DeserializeOwned + Debug,
    I: Serialize,
    E: DeserializeOwned + Debug,
>(
    contract_address: &str,
    input: I,
) -> ViewResult<V, E> {
    let input = match to_json_value(&input) {
        Ok(v) => v,
        Err(e) => return ViewResult::RuntimeError(format!("{e:?}")),
    };
    match SmartWeave::view_contract_state(contract_address, input).await {
        Ok(s) => match from_json::<V, E>(s) {
            WarpResult::WriteSuccess() => {
                ViewResult::RuntimeError("got WriteResponse for view call".to_owned())
            }
            v => v.into(),
        },
        Err(e) => ViewResult::RuntimeError(format!("{e:?}")),
    }
}

/// performs 'write' operation identified by `input` on the current state of the contract identified by `contract_address`
pub async fn write_foreign_contract<I: Serialize, E: DeserializeOwned + Debug>(
    contract_address: &str,
    input: I,
) -> WriteResult<(), E> {
    let input = match to_json_value(&input) {
        Ok(v) => v,
        Err(e) => return WriteResult::RuntimeError(format!("{e:?}")),
    };
    let write_result = SmartWeave::write(contract_address, input).await;
    match write_result {
        Ok(s) => match from_json::<(), E>(s) {
            WarpResult::ViewSuccess(_) => {
                WriteResult::RuntimeError("got ViewResponse for write call".to_owned())
            }
            v => v.into(),
        },
        Err(e) => WriteResult::RuntimeError(format!("{e:?}")),
    }
}
