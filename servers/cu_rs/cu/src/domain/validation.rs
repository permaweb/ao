use serde::Deserialize;
use valid::{invalid_value, FieldName, Validate, Validation};
use std::fmt::Display;
use regex::Regex;
use wasm_bindgen::JsValue;

pub struct UrlConstraint {
    regex: Regex
}

impl UrlConstraint {
    pub fn new() -> Self {
        UrlConstraint {
            regex: Regex::new(r"(http://|https://)+").unwrap()
        }
    }

    pub fn is_url(&self, val: Option<String>) -> bool {        
        if val.is_some() && self.regex.is_match(val.unwrap().as_str()) {
            return true;
        }
        return false;
    }
}

impl Validate<UrlConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &UrlConstraint) -> valid::Validation<UrlConstraint, Self> {
        if constraint.is_url(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-url", context, self.clone(), "string with http or https".to_string())])
    }
}

pub enum DbMode {
    Remote,
    Embedded
}

impl Display for DbMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DbMode::Remote => write!(f, "remote"),
            DbMode::Embedded => write!(f, "embedded")
        }
    }
}

pub struct DbModeConstraint {
    db_mode_remote: String,
    db_mode_embedded: String
}

impl DbModeConstraint {
    pub fn new() -> Self {
        DbModeConstraint {
            db_mode_remote: format!("{}", DbMode::Remote),
            db_mode_embedded: format!("{}", DbMode::Embedded)
        }
    }

    pub fn is_valid_mode(&self, val: Option<String>) -> bool {     
        if val.is_some() && self.db_mode_remote == val.unwrap() {
            return true;
        }
        return false;
    }
}

impl Validate<DbModeConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &DbModeConstraint) -> Validation<DbModeConstraint, Self> {
        if constraint.is_valid_mode(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-db-mode", context, self.clone(), "string must be remote or embedded".to_string())])
    }
}

pub struct IntegerConstraint; 

impl IntegerConstraint {
    pub fn is_integer(&self, val: Option<String>) -> bool {
        if val.is_some() {
            if let Ok(val) = val.unwrap().parse::<i64>() {
                return true;
            }
        }
        return false;
    }
}

impl Validate<IntegerConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &IntegerConstraint) -> Validation<IntegerConstraint, Self> {
        if constraint.is_integer(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-integer", context, self.clone(), "value must be an integer".to_string())])
    }
}

pub struct TruthyConstraint;

impl TruthyConstraint {
    pub fn is_truthy(&self, val: Option<String>) -> bool {
        if val.is_some() {
            let unwrapped_val = val.unwrap();
            let val_str = unwrapped_val.as_str();
            if val_str != "0"
                && val_str != ""
                && val_str != "false"
                && val_str != "null"
                && val_str != "undefined"
                && val_str != "NaN"
                {
                return true;
            }
        }
        return false;
    }
}

impl Validate<TruthyConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &TruthyConstraint) -> Validation<TruthyConstraint, Self> {
        if constraint.is_truthy(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-truthy", context, self.clone(), "value must be js truthy".to_string())])
    }
}

/// Checks if string is an array or comma separated list of uuid
pub struct UuidArrayConstraint {
    array_regex: Regex,
    comma_delim_list_regex: Regex
}

impl UuidArrayConstraint {
    pub fn new() -> Self {
        UuidArrayConstraint {
            array_regex: Regex::new(r#"^\[(?:\s*"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"(?:,\s*"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")*)\]$"#).unwrap(),
            comma_delim_list_regex: Regex::new(r#"^"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"(?:,\s*"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")*$"#).unwrap()
        }
    }

    pub fn is_array(&self, val: Option<String>) -> bool {
        if val.is_some() {
            if self.array_regex.is_match(val.unwrap().as_str()) {
                return true;
            }
        }
        return false;
    }

    pub fn is_comma_delim_list(&self, val: Option<String>) -> bool {
        if val.is_some() {
            if self.comma_delim_list_regex.is_match(val.unwrap().as_str()) {
                return true;
            }
        }
        return false;
    }
}

impl Validate<UuidArrayConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &UuidArrayConstraint) -> Validation<UuidArrayConstraint, Self> {
        if constraint.is_array(Some(self.clone())) || constraint.is_comma_delim_list(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-array", context, self.clone(), "value must be an array or comma delimited list".to_string())])
    }
}

pub struct StreamConstraint;

impl StreamConstraint {
    fn is_stream(val: Option<String>) -> bool {
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

#[derive(Deserialize)]
pub struct EventEmitter;
pub struct Options {
    pub end: Option<bool>
}
trait GenericEventEmitter<T> {
    fn pipe(
        destination: T,
        options: Options
    ) -> T;
}

impl<T> GenericEventEmitter<T> for EventEmitter {
    fn pipe(
        destination: T,
        options: Options
    ) -> T {
        destination
    }
}