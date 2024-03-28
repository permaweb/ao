mod utils;

#[allow(unused)]
use crate::utils::set_panic_hook;
#[allow(unused_imports)]
use wasmedge_bindgen::*;
use wasmedge_bindgen_macro::*;

#[wasmedge_bindgen]
pub fn greet() -> String {
    "hellow world".to_string()
}