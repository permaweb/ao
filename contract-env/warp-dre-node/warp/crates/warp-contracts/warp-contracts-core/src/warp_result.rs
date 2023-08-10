#[doc(hidden)]
use crate::handler_result::{ViewResult, WriteResult};

pub enum WarpResult<View, Error> {
    WriteSuccess(),
    ViewSuccess(View),
    ContractError(Error),
    RuntimeError(String),
}

impl<V, E> From<ViewResult<V, E>> for WarpResult<V, E> {
    fn from(value: ViewResult<V, E>) -> Self {
        match value {
            ViewResult::Success(v) => WarpResult::ViewSuccess(v),
            ViewResult::ContractError(e) => WarpResult::ContractError(e),
            ViewResult::RuntimeError(e) => WarpResult::RuntimeError(e),
        }
    }
}

impl<S, V, E> From<WriteResult<S, E>> for WarpResult<V, E> {
    fn from(value: WriteResult<S, E>) -> Self {
        match value {
            WriteResult::Success(_) => WarpResult::WriteSuccess(),
            WriteResult::ContractError(e) => WarpResult::ContractError(e),
            WriteResult::RuntimeError(e) => WarpResult::RuntimeError(e),
        }
    }
}

impl<V, E> From<WarpResult<V, E>> for ViewResult<V, E> {
    fn from(value: WarpResult<V, E>) -> Self {
        match value {
            WarpResult::WriteSuccess() => unreachable!(),
            WarpResult::ViewSuccess(v) => ViewResult::Success(v),
            WarpResult::ContractError(e) => ViewResult::ContractError(e),
            WarpResult::RuntimeError(e) => ViewResult::RuntimeError(e),
        }
    }
}

impl<V, E> From<WarpResult<V, E>> for WriteResult<(), E> {
    fn from(value: WarpResult<V, E>) -> Self {
        match value {
            WarpResult::WriteSuccess() => WriteResult::Success(()),
            WarpResult::ViewSuccess(_) => unreachable!(),
            WarpResult::ContractError(e) => WriteResult::ContractError(e),
            WarpResult::RuntimeError(e) => WriteResult::RuntimeError(e),
        }
    }
}

// Module defining format as expected by SDK. It covers (de)serialization.
// We have this separated from WarpResult above (visible to contract code) to
// keep WarpResult interface clean
pub mod transmission {
    use super::WarpResult;
    use core::fmt::Debug;
    use serde::{de::DeserializeOwned, Deserialize, Serialize};
    use wasm_bindgen::JsValue;

    #[derive(Serialize, Deserialize)]
    pub struct ErrorResult {
        #[serde(rename = "errorMessage")]
        error_message: String,
    }

    #[derive(Serialize, Deserialize, Debug)]
    pub struct Transmission<View, Error> {
        #[serde(rename = "type")]
        result_type: String,
        result: Option<View>,
        error: Option<Error>,
        #[serde(rename = "errorMessage")]
        error_message: Option<String>,
    }

    impl<V: Debug, E: Debug> From<Transmission<V, E>> for WarpResult<V, E> {
        fn from(value: Transmission<V, E>) -> Self {
            match value.result_type.as_str() {
                "ok" if value.result.is_none() => WarpResult::WriteSuccess(),
                "ok" => WarpResult::ViewSuccess(value.result.unwrap()),
                "error" if value.error.is_some() => WarpResult::ContractError(value.error.unwrap()),
                "exception" if value.error_message.is_some() => {
                    WarpResult::RuntimeError(value.error_message.unwrap())
                }
                _ => WarpResult::RuntimeError(format!("failed to parse response {:?}", value)),
            }
        }
    }

    impl<V, E> From<WarpResult<V, E>> for Transmission<V, E> {
        fn from(value: WarpResult<V, E>) -> Self {
            let mut res = Transmission {
                result_type: "".to_owned(),
                result: None,
                error: None,
                error_message: None,
            };
            match value {
                WarpResult::WriteSuccess() => {
                    res.result_type = "ok".to_owned();
                }
                WarpResult::ViewSuccess(v) => {
                    res.result_type = "ok".to_owned();
                    res.result = Some(v);
                }
                WarpResult::ContractError(e) => {
                    res.result_type = "error".to_owned();
                    res.error = Some(e);
                }
                WarpResult::RuntimeError(e) => {
                    res.result_type = "exception".to_owned();
                    res.error_message = Some(e);
                }
            };
            res
        }
    }

    pub fn from_json<V: Debug, E: Debug>(warp_result: JsValue) -> WarpResult<V, E>
    where
        V: DeserializeOwned,
        E: DeserializeOwned,
    {
        match serde_wasm_bindgen::from_value::<Transmission<V, E>>(warp_result) {
            Ok(t) => t.into(),
            Err(e) => WarpResult::RuntimeError(format!("{e:?}")),
        }
    }
}
