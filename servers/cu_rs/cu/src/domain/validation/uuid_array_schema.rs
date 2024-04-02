use std::borrow::Cow;
use regex::Regex;
use valid::{invalid_value, FieldName, Validate, Validation, ValidationError};

pub const INVALID_ARRAY: &str = "invalid-array";

pub fn parse_array_schema(val: Option<String>) -> Result<Vec<String>, ValidationError> {
    let constraint = UuidArrayConstraint::new();
    let result = val.validate("val", &constraint).result();
    match result {
        Ok(validated) => {
            let val = validated.unwrap();
            if constraint.is_array(val.clone()) {
                let list = val.unwrap().replace("[", "").replace("]", "");
                let list = list.split(',').map(|item| {
                    item.to_string()
                }).collect::<Vec<String>>();
                return Ok(list);
            } else if constraint.is_comma_delim_list(val.clone()) {
                let list = val.unwrap().split(',').map(|item| {
                    item.to_string()
                }).collect::<Vec<String>>();
                return Ok(list);
            }
            Err(ValidationError {
                message: Some(Cow::from("value is not an array or comma delimited list")),
                violations: vec![]
            })
        },
        Err(e) => Err(e)
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

impl Validate<UuidArrayConstraint, FieldName> for Option<String> {
    fn validate(self, context: impl Into<FieldName>, constraint: &UuidArrayConstraint) -> Validation<UuidArrayConstraint, Self> {
        if constraint.is_array(self.clone()) || constraint.is_comma_delim_list(self.clone()) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-array", context, if self.is_none() { "".to_string() } else { self.unwrap() }, "value must be an array or comma delimited list".to_string())])
    }
}