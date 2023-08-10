//! Type safe wrappers over <https://docs.warp.cc/docs/sdk/advanced/kv-storage> API

use super::js_imports::KV;
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_wasm_bindgen::from_value;
use warp_contracts_core::{handler_result::ViewResult, methods::to_json_value};

#[derive(Debug)]
pub enum KvError {
    NotFound,
}

/// returns KV value stored under the key `key`, `NotFound` error or `RuntimeError`
pub async fn kv_get<T: DeserializeOwned + Default>(key: &str) -> ViewResult<T, KvError> {
    match KV::get(key).await {
        Ok(a) if !a.is_null() => match from_value(a) {
            Ok(v) => ViewResult::Success(v),
            Err(e) => ViewResult::RuntimeError(format!("{e:?}")),
        },
        Ok(_) => ViewResult::ContractError(KvError::NotFound),
        Err(e) => ViewResult::RuntimeError(format!("{e:?}")),
    }
}

/// stores `value` under `key` in KV. returns `Ok` on success and `Err(String)` on error
pub async fn kv_put<T: Serialize>(key: &str, value: T) -> Result<(), String> {
    match to_json_value(&value) {
        Ok(v) => match KV::put(key, v).await {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("{e:?}")),
        },
        Err(e) => Err(format!("{:?}", e)),
    }
}
