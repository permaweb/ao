use valid::{invalid_state, State, Validate, Validation};
use wasm_bindgen::JsValue;
use serde::Deserialize;

pub struct StreamConstraint;
pub struct StreamState;

impl StreamState {
    // todo: switch to ParseSchema trait
    // pub fn parse_stream_schema(val: Option<String>) -> Result<GenericEventEmitter<String>, ValidationError> {
    //     if let None = val {
    //         return option_validation_result(val.validate("val", &NotEmpty).with_message("Value must implement the iteration protocol"));
    //     }
    //     validation_result(val.validate(&StreamState, &StreamConstraint).with_message("Value must implement the iteration protocol"))
    // }

    pub fn is_stream(&self, val: Option<String>) -> bool {
        if let None = val {
            return false;
        }

        let stream = JsValue::from(val.clone());
        if stream.is_null() || !stream.is_object() {
            return false;
        }
        let emitter_result = serde_json::from_str::<EventEmitter>(val.unwrap().as_str());
        match emitter_result {
            Ok(_) => true,
            _ => false
        }
    }
}

impl<'a> Validate<StreamConstraint, State<&'a StreamState>> for Option<String> {
    fn validate(self, context: impl Into<State<&'a StreamState>>, _constraint: &StreamConstraint) -> Validation<StreamConstraint, Self> {
        let context: State<&'a StreamState> = context.into();
        if context.is_stream(self.clone()) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_state("invalid-stream", vec![])])
    }
}

#[derive(Deserialize)]
pub struct EventEmitter;
pub struct Options {
    pub end: Option<bool>
}
pub trait GenericEventEmitter<T> {
    fn pipe(
        destination: T,
        options: Options
    ) -> T;
}

#[allow(unused)]
impl<T> GenericEventEmitter<T> for EventEmitter {
    fn pipe(
        destination: T,
        options: Options
    ) -> T {
        destination
    }
}