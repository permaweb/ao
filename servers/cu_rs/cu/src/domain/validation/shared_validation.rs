use valid::{constraint::{CharCount, NotEmpty}, invalid_value, FieldName, Validate, Validation, ValidationError, ValidationResult};
use std::{borrow::Cow, fmt::Display};
use regex::Regex;

pub const INVALID_EMPTY: &str = "invalid-empty";
pub const INVALID_NOT_MATCH_UNDERSCORE: &str = "invalid-positive-int-no-match-underscore";
pub const INVALID_NOT_MATCH_NUMBER: &str = "invalid-positive-int-no-match-number";
pub const INVALID_URL: &str = "invalid-url";

pub fn parse_db_mode_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).result());
    }
    validation_result(val.unwrap().validate("val", &DbModeConstraint::new()).result())
}

const DB_URL_MESSAGE: &str = "DB_URL must be set to the database connection string";
pub fn parse_db_url_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(DB_URL_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).with_message(DB_URL_MESSAGE))
}

const DB_MAX_LISTENERS: &str = "DB_MAX_LISTENERS must be an integer";
pub fn parse_db_max_listeners_schema(val: Option<String>) -> Result<i64, ValidationError> {
    if let None = val {
        return Err(ValidationError {
            message: Some(Cow::from(DB_MAX_LISTENERS)),
            violations: vec![]
        });
    }
    let result = val.unwrap().validate("val", &IntegerConstraint).with_message(DB_MAX_LISTENERS);
    match result {
        Ok(val) => Ok(val.parse::<i64>().unwrap()),
        Err(e) => Err(e)
    }
}

const WALLET_MESSAGE: &str = "WALLET must be a Wallet JWK Inteface";
pub fn parse_wallet_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(WALLET_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).with_message(WALLET_MESSAGE))
}

pub fn parse_truthy_schema(val: Option<String>) -> Result<bool, ValidationError> {
    if let None = val {
        return Err(ValidationError {
            message: Some(Cow::from("value is falsey")),
            violations: vec![]
        });
    }
    let result = val.unwrap().validate("val", &TruthyConstraint).result();
    match result {
        Ok(_val) => Ok(true),
        Err(e) => Err(e)
    }
}

pub fn parse_min_char_one_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).result());
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).result())
}

pub fn parse_array_schema(val: Option<String>) -> Result<Vec<String>, ValidationError> {
    if let None = val {
        return Err(ValidationError {
            message: Some(Cow::from("value is empty")),
            violations: vec![]
        });
    }

    let constraint = UuidArrayConstraint::new();
    let result = val.unwrap().validate("val", &constraint).result();
    match result {
        Ok(validated) => {
            let val = validated.unwrap();
            if constraint.is_array(Some(val.clone())) {
                let list = val.replace("[", "").replace("]", "");
                let list = list.split(',').map(|item| {
                    item.to_string()
                }).collect::<Vec<String>>();
                return Ok(list);
            } else if constraint.is_comma_delim_list(Some(val.clone())) {
                let list = val.split(',').map(|item| {
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

pub fn option_validation_result<T>(result: ValidationResult<NotEmpty, Option<T>>) -> Result<T, ValidationError> {
    match result {
        Ok(res) => Ok(res.unwrap().unwrap()),
        Err(e) => Err(e)
    }  
}

pub fn validation_result<C, T>(result: ValidationResult<C, T>) -> Result<T, ValidationError> {
    match result {
        Ok(res) => Ok(res.unwrap()),
        Err(e) => Err(e)
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
            if let Ok(_val) = val.unwrap().parse::<i64>() {
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

