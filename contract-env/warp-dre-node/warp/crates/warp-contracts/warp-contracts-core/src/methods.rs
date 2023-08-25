use crate::{
    detail::BorrowingFn,
    handler_result::{ViewResult, WriteResult},
    optional_cell::{CloneContents, OptionalCell},
    warp_result::transmission::Transmission,
    warp_result::WarpResult,
};
use core::fmt::Debug;
use core::future::Future;
use serde::{de::DeserializeOwned, Serialize};
use serde_wasm_bindgen::from_value;
use wasm_bindgen::JsValue;

pub async fn write_async<State, Action, Error, Fun, Fut>(
    state: &OptionalCell<State>,
    interaction: JsValue,
    write_contract_method: Fun,
) -> JsValue
where
    State: Clone + Debug + Serialize,
    Action: DeserializeOwned + Debug,
    Error: Serialize,
    Fun: FnOnce(State, Action) -> Fut,
    Fut: Future<Output = WriteResult<State, Error>>,
{
    let result = match parse_input(state, interaction) {
        Err(value) => return value,
        Ok(action) => write_contract_method(state.clone_contents(), action).await,
    };

    map_write_result(result, state)
}

pub fn write_sync<State, Action, Error, Fun>(
    s: &OptionalCell<State>,
    interaction: JsValue,
    write_contract_method: Fun,
) -> JsValue
where
    State: Clone + Debug + Serialize,
    Action: DeserializeOwned + Debug,
    Error: Serialize,
    Fun: FnOnce(State, Action) -> WriteResult<State, Error>,
{
    let result = match parse_input(s, interaction) {
        Err(value) => return value,
        Ok(action) => write_contract_method(s.clone_contents(), action),
    };

    map_write_result(result, s)
}

// We need a dedicated trait BorrowingFn to attach the same lifetime
// that is not possible to specify by the caller of the view_async to both &State and Future
pub async fn view_async<State, Action, View, Error, Fun>(
    s: &OptionalCell<State>,
    interaction: JsValue,
    view_contract_method: Fun,
) -> JsValue
where
    State: Clone,
    Action: DeserializeOwned + core::fmt::Debug,
    View: Serialize + Debug,
    Error: Serialize + Debug,
    Fun: for<'a> BorrowingFn<'a, State, Action, ViewResult<View, Error>>,
{
    let result = match parse_input(s, interaction) {
        Err(value) => return value,
        Ok(action) => {
            view_contract_method
                .call(s.cell.borrow().as_ref().unwrap(), action)
                .await
        }
    };

    to_json_value::<Transmission<View, Error>>(&WarpResult::from(result).into()).unwrap()
}

pub fn view_sync<State, Action, View, Error, Fun>(
    s: &OptionalCell<State>,
    interaction: JsValue,
    view_contract_method: Fun,
) -> JsValue
where
    State: Clone,
    Action: DeserializeOwned + Debug,
    View: Serialize,
    Error: Serialize,
    Fun: FnOnce(&State, Action) -> ViewResult<View, Error>,
{
    let result = match parse_input(s, interaction) {
        Err(value) => return value,
        Ok(action) => view_contract_method(s.cell.borrow().as_ref().unwrap(), action),
    };

    to_json_value::<Transmission<View, Error>>(&WarpResult::from(result).into()).unwrap()
}

fn map_write_result<State, Error>(
    result: WriteResult<State, Error>,
    state: &OptionalCell<State>,
) -> JsValue
where
    State: Clone + Debug + Serialize,
    Error: Serialize,
{
    if let WriteResult::Success(new_state) = result {
        state.cell.replace(Some(new_state));
        to_json_value::<Transmission<(), Error>>(&WarpResult::WriteSuccess().into()).unwrap()
    } else {
        to_json_value::<Transmission<(), Error>>(&WarpResult::from(result).into()).unwrap()
    }
}

fn parse_input<State, Action>(
    state: &OptionalCell<State>,
    interaction: JsValue,
) -> Result<Action, JsValue>
where
    Action: DeserializeOwned + core::fmt::Debug,
    State: Clone,
{
    let action = from_value(interaction);
    if action.is_err() {
        return Err(runtime_error(format!(
            "Error while parsing input {}",
            action.unwrap_err()
        )));
    }
    if state.is_empty() {
        return Err(runtime_error(format!(
            "initState MUST be called before interaction can take place"
        )));
    }

    Ok(action.unwrap())
}

pub fn init_state<S: DeserializeOwned>(
    state: &OptionalCell<S>,
    init_state: &JsValue,
) -> Option<String> {
    match from_value(init_state.clone()) {
        Ok(parsed_state) => {
            state.cell.replace(Some(parsed_state));
            None
        }
        Err(e) => {
            let ret = format!("failed to parse init state {:?}", e);
            #[cfg(feature = "debug")]
            {
                web_sys::console::debug_1(&JsValue::from_str(&ret));
            }
            Option::from(ret)
        }
    }
}

pub fn current_state<State: Serialize + Debug>(state: &OptionalCell<State>) -> JsValue {
    // not sure if that's deterministic - which is very important for the execution network.
    // TODO: perf - according to docs:
    // "This is unlikely to be super speedy so it's not recommended for large payload"
    // - we should minimize calls to serde_wasm_bindgen::to_json_value
    if state.is_empty() {
        runtime_error(
            "contract state not initialized. please run initState method first".to_owned(),
        )
    } else {
        match to_json_value(state.cell.borrow().as_ref().unwrap()) {
            Ok(v) => v,
            Err(e) => runtime_error(format!("failed to serialize return value {:?}", e)),
        }
    }
}

pub fn to_json_value<T: serde::ser::Serialize + ?Sized>(
    value: &T,
) -> core::result::Result<JsValue, serde_wasm_bindgen::Error> {
    let serializer = serde_wasm_bindgen::Serializer::json_compatible();
    value.serialize(&serializer)
}

pub fn runtime_error(error_message: String) -> JsValue {
    to_json_value::<Transmission<(), ()>>(&WarpResult::RuntimeError(error_message).into()).unwrap()
}
