use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::from_value;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "theAnswer")]
    pub fn the_answer() -> u8;

    #[wasm_bindgen(js_name = "multiplyTheAnswer")]
    pub fn multiply_the_answer(times: u8) -> u8;

    #[wasm_bindgen(js_name = "concatenateTheAnswer")]
    pub fn concatenate_the_answer(prefix: String) -> String;

    #[wasm_bindgen(js_name = "wrapTheAnswer")]
    pub fn the_answer_wrapped(wrapper: JsValue) -> JsValue;
}

#[derive(Serialize, Deserialize, Default)]
pub struct TheAnswerWrapper {
    pub context: String,
    pub answer: u8,
}

// convenient rust-typed wrapper for JsValue -> JsValue method
pub fn wrap_the_answer(context: &str) -> TheAnswerWrapper {
    from_value::<TheAnswerWrapper>(the_answer_wrapped(JsValue::from_str(context)))
        .unwrap_or_default()
}
