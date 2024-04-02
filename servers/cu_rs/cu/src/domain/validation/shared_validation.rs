use valid::{constraint::{CharCount, NotEmpty}, Validate, ValidationError, ValidationResult};
use std::fmt::Display;

pub const INVALID_EMPTY: &str = "invalid-empty";
pub const INVALID_NOT_MATCH_UNDERSCORE: &str = "invalid-positive-int-no-match-underscore";
pub const INVALID_NOT_MATCH_NUMBER: &str = "invalid-positive-int-no-match-number";
pub const INVALID_URL: &str = "invalid-url";
pub const INVALID_WALLET: &str = "invalid-wallet";

const DB_URL_MESSAGE: &str = "DB_URL must be set to the database connection string";
pub fn parse_db_url_schema(val: Option<String>, field_name: &str) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate(field_name.to_string(), &NotEmpty).with_message(DB_URL_MESSAGE));
    }
    validation_result(val.unwrap().validate(field_name.to_string(), &CharCount::Min(1)).with_message(DB_URL_MESSAGE))
}

const WALLET_MESSAGE: &str = "WALLET must be a Wallet JWK Inteface";
pub fn parse_wallet_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("WALLET", &NotEmpty).with_message(WALLET_MESSAGE));
    }
    validation_result(val.unwrap().validate("WALLET", &CharCount::Min(1)).with_message(WALLET_MESSAGE))
}

pub fn parse_min_char_one_schema(val: Option<String>, field_name: &str) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate(field_name.to_string(), &NotEmpty).result());
    }
    validation_result(val.unwrap().validate(field_name.to_string(), &CharCount::Min(1)).result())
}

pub fn option_validation_result<C, T>(result: ValidationResult<C, Option<T>>) -> Result<T, ValidationError> {
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
