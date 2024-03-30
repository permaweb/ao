use lazy_static::lazy_static;
use std::{borrow::Cow, sync::{Arc, RwLock}};
use valid::{constraint::{CharCount, NotEmpty}, ConstraintViolation, InvalidValue, Validate, ValidationError, ValidationResult};
use dotenv::dotenv;
use regex::Regex;
use super::validation::{DbModeConstraint, IntegerConstraint, UrlConstraint};

/// @FIL - function int limit
/// @FURL - function is url
#[allow(non_snake_case)]
struct DomainConfigSchema<FIL, FURL>
    where
        FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
        FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync
{
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: FIL,
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: FIL,
    pub GATEWAY_URL: FURL,
    pub UPLOADER_URL: FURL,
    pub DB_MODE: FURL,
    pub DB_URL: FURL,
    pub DB_MAX_LISTENERS: FIL
}

unsafe impl<FIL, FURL> Send for DomainConfigSchema<FIL, FURL>
where 
    FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
    FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync {}

unsafe impl<FIL, FURL> Sync for DomainConfigSchema<FIL, FURL>
where 
    FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
    FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync {}

impl<FIL, FURL> DomainConfigSchema<FIL, FURL>
where 
    FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
    FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync {
    fn new(
        positive_int_schema: FIL, 
        url_schema: FURL,
        db_mode_schema: FURL,
        db_url_schema: FURL,
        db_max_listeners: FIL
    ) -> Self {
        dotenv().ok();

        DomainConfigSchema {
            PROCESS_WASM_MEMORY_MAX_LIMIT: positive_int_schema,
            PROCESS_WASM_COMPUTE_MAX_LIMIT: positive_int_schema,
            GATEWAY_URL: url_schema,
            UPLOADER_URL: url_schema,
            DB_MODE: db_mode_schema,
            DB_URL: db_url_schema,
            DB_MAX_LISTENERS: db_max_listeners
        }
    }    
}

fn positive_int_schema(val: Option<String>) -> Result<i64, ValidationError> {
    let regex = Regex::new(r"^(?!_)[0-9_]+(?!_)$").unwrap();
    if let None = val {
        return Ok(-1);
    } else if regex.is_match(val.unwrap().as_str()) {
        let final_val = val.unwrap().replace("_", "");
        let final_val = final_val.parse::<i64>().unwrap();
        return Ok(final_val);
    } else if let Ok(val) = val.unwrap().parse::<i64>() {
        return Ok(val);
    }

    Err(ValidationError {
        message: Some(Cow::from("Provided invalid value for positive_int_schema")),
        violations: vec![]
    })
}

const URL_MESSAGE: &str = "URL must be a a valid URL";
fn url_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(URL_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &UrlConstraint::new()).with_message(URL_MESSAGE))
}

fn db_mode_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).result());
    }
    validation_result(val.unwrap().validate("val", &DbModeConstraint::new()).result())
}

const DB_URL_MESSAGE: &str = "DB_URL must be set to the database connection string";
fn db_url_schema(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(DB_URL_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).with_message(DB_URL_MESSAGE))
}

const DB_MAX_LISTENERS: &str = "DB_MAX_LISTENERS must be an integer";
fn db_max_listeners(val: Option<String>) -> Result<i64, ValidationError> {
    if let None = val {
        return Err(ValidationError {
            message: Some(Cow::from("DB_MAX_LISTENERS must have a value")),
            violations: vec![]
        });
    }
    let result = val.unwrap().validate("val", &IntegerConstraint).with_message(DB_MAX_LISTENERS);
    match result {
        Ok(val) => Ok(val.parse::<i64>().unwrap()),
        Err(e) => Err(e)
    }
}

fn option_validation_result<T>(result: ValidationResult<NotEmpty, Option<T>>) -> Result<T, ValidationError> {
    match result {
        Ok(res) => Ok(res.unwrap().unwrap()),
        Err(e) => Err(e)
    }  
}

fn validation_result<C, T>(result: ValidationResult<C, T>) -> Result<T, ValidationError> {
    match result {
        Ok(res) => Ok(res.unwrap()),
        Err(e) => Err(e)
    }  
}

lazy_static! {
    pub static ref DOMAIN_CONFIG_SCHEMA: Arc<
        RwLock<
            DomainConfigSchema<
                Box<dyn Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync>, 
                Box<dyn Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync>
            >
        >
    > = {
        let domain_config_schema = Arc::new(RwLock::new(
            DomainConfigSchema::<
                Box<dyn Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync>,
                Box<dyn Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync>
            >::new(
                Box::new(&positive_int_schema), 
                Box::new(&url_schema), 
                Box::new(&db_mode_schema), 
                Box::new(&db_url_schema),
                Box::new(&db_max_listeners)
            )
        ));
        domain_config_schema
    };
}

