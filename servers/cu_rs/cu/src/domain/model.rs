use lazy_static::lazy_static;
use std::{borrow::Cow, sync::{Arc, RwLock}};
use valid::{constraint::{CharCount, NotEmpty}, Validate, ValidationError, ValidationResult};
use dotenv::dotenv;
use regex::Regex;
use super::validation::{DbModeConstraint, IntegerConstraint, TruthyConstraint, UrlConstraint, UuidArrayConstraint};

/// @FIL - function int limit
/// 
/// @FURL - function is url
/// 
/// @FBOOL - function is truthy
#[allow(non_snake_case)]
struct DomainConfigSchema<FIL, FURL, FBOOL, FARRAY>
    where
        FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
        FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync,
        FBOOL: Fn(Option<String>) -> Result<bool, ValidationError> + Send + Sync,
        FARRAY: Fn(Option<String>) -> Result<Vec<String>, ValidationError> + Send + Sync
{
    /**
    * The maximum Memory-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: FIL,
    /**
    * The maximum Compute-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: FIL,
    /**
    * The gateway for the CU to use fetch block metadata, data on arweave,
    * and Scheduler-Location data
    */
    pub GATEWAY_URL: FURL,
    /**
    * The url of the uploader to use to upload Process Checkpoints to Arweave
    */
    pub UPLOADER_URL: FURL,
    /**
    * Whether the database being used by the CU is embedded within the CU (ie. PouchDB)
    * or is on another remote process (ie. CouchDB)
    */
    pub DB_MODE: FURL,
    /**
    * The connection string to the database
    */
    pub DB_URL: FURL,
    /**
    * The maximum number of event listeners for the database
    */
    pub DB_MAX_LISTENERS: FIL,
    /**
    * The wallet for the CU
    */
    pub WALLET: FURL,
    /**
    * The interval, in milliseconds, at which to log memory usage on this CU.
    */
    pub MEM_MONITOR_INTERVAL: FIL,
    /**
    * The amount of time, in milliseconds, that the CU should wait before creating a process Checkpoint,
    * if it has already created a Checkpoint for that process.
    *
    * This is effectively a throttle on Checkpoint creation, for a given process
    */
    PROCESS_CHECKPOINT_CREATION_THROTTLE: FIL,
    /**
    * Whether to disable Process Checkpoint creation entirely. Great for when developing locally,
    * of for an ephemeral CU
    */
    DISABLE_PROCESS_CHECKPOINT_CREATION: FBOOL,
    /**
    * If an evaluation stream evaluates this amount of messages,
    * then it will immediately create a Checkpoint at the end of the
    * evaluation stream
    */
    EAGER_CHECKPOINT_THRESHOLD: FIL,
    /**
    * The number of workers to use for evaluating messages
    */
    WASM_EVALUATION_MAX_WORKERS: FIL,
    /**
    * The maximum size of the in-memory cache used for wasm instances
    */
    WASM_INSTANCE_CACHE_MAX_SIZE: FIL,
    /**
    * The maximum size of the in-memory cache used for Wasm modules
    */
    WASM_MODULE_CACHE_MAX_SIZE: FIL,
    /**
    * The directory to place wasm binaries downloaded from arweave.
    */
    WASM_BINARY_FILE_DIRECTORY: FURL,
    /**
    * An array of process ids that should not use Checkpoints
    * on Arweave.
    */
    PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: FARRAY
}

unsafe impl<FIL, FURL, FBOOL, FARRAY> Send for DomainConfigSchema<FIL, FURL, FBOOL, FARRAY>
where 
    FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
    FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync,
    FBOOL: Fn(Option<String>) -> Result<bool, ValidationError> + Send + Sync,
    FARRAY: Fn(Option<String>) -> Result<Vec<String>, ValidationError> + Send + Sync {}

unsafe impl<FIL, FURL, FBOOL, FARRAY> Sync for DomainConfigSchema<FIL, FURL, FBOOL, FARRAY>
where 
    FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
    FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync,
    FBOOL: Fn(Option<String>) -> Result<bool, ValidationError> + Send + Sync,
    FARRAY: Fn(Option<String>) -> Result<Vec<String>, ValidationError> + Send + Sync {}

impl<FIL, FURL, FBOOL, FARRAY> DomainConfigSchema<FIL, FURL, FBOOL, FARRAY>
where 
    FIL: Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync,
    FURL: Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync,
    FBOOL: Fn(Option<String>) -> Result<bool, ValidationError> + Send + Sync,
    FARRAY: Fn(Option<String>) -> Result<Vec<String>, ValidationError> + Send + Sync {
    fn new(
        positive_int_parse: FIL, 
        url_parse: FURL,
        db_mode_parse: FURL,
        db_url_parse: FURL,
        db_max_listeners: FIL,
        wallet_parse: FURL,
        truthy_parse: FBOOL,
        min_char_1_parse: FURL,
        array_parse: FARRAY
    ) -> Self {
        dotenv().ok();

        DomainConfigSchema {
            PROCESS_WASM_MEMORY_MAX_LIMIT: positive_int_parse,
            PROCESS_WASM_COMPUTE_MAX_LIMIT: positive_int_parse,
            GATEWAY_URL: url_parse,
            UPLOADER_URL: url_parse,
            DB_MODE: db_mode_parse,
            DB_URL: db_url_parse,
            DB_MAX_LISTENERS: db_max_listeners,
            WALLET: wallet_parse,
            MEM_MONITOR_INTERVAL: positive_int_parse,
            PROCESS_CHECKPOINT_CREATION_THROTTLE: positive_int_parse,
            DISABLE_PROCESS_CHECKPOINT_CREATION: truthy_parse,
            EAGER_CHECKPOINT_THRESHOLD: positive_int_parse,
            WASM_EVALUATION_MAX_WORKERS: positive_int_parse,
            WASM_INSTANCE_CACHE_MAX_SIZE: positive_int_parse,
            WASM_MODULE_CACHE_MAX_SIZE: positive_int_parse,
            WASM_BINARY_FILE_DIRECTORY: min_char_1_parse,
            PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: array_parse
        }
    }    
}

fn positive_int_parse(val: Option<String>) -> Result<i64, ValidationError> {
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
fn url_parse(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(URL_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &UrlConstraint::new()).with_message(URL_MESSAGE))
}

fn db_mode_parse(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).result());
    }
    validation_result(val.unwrap().validate("val", &DbModeConstraint::new()).result())
}

const DB_URL_MESSAGE: &str = "DB_URL must be set to the database connection string";
fn db_url_parse(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(DB_URL_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).with_message(DB_URL_MESSAGE))
}

fn min_char_1_parse(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).result());
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).result())
}

const DB_MAX_LISTENERS: &str = "DB_MAX_LISTENERS must be an integer";
fn db_max_listeners(val: Option<String>) -> Result<i64, ValidationError> {
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
fn wallet_parse(val: Option<String>) -> Result<String, ValidationError> {
    if let None = val {
        return option_validation_result(val.validate("val", &NotEmpty).with_message(WALLET_MESSAGE));
    }
    validation_result(val.unwrap().validate("val", &CharCount::Min(1)).with_message(WALLET_MESSAGE))
}

fn truthy_parse(val: Option<String>) -> Result<bool, ValidationError> {
    if let None = val {
        return Err(ValidationError {
            message: Some(Cow::from("value is falsey")),
            violations: vec![]
        });
    }
    let result = val.unwrap().validate("val", &TruthyConstraint).result();
    match result {
        Ok(val) => Ok(true),
        Err(e) => Err(e)
    }
}

fn array_parse(val: Option<String>) -> Result<Vec<String>, ValidationError> {
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
            if constraint.is_array(Some(val)) {
                let list = val.replace("[", "").replace("]", "");
                let list = list.split(',').map(|item| {
                    item.to_string()
                }).collect::<Vec<String>>();
                return Ok(list);
            } else if constraint.is_comma_delim_list(Some(val)) {
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
                Box<dyn Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync>,
                Box<dyn Fn(Option<String>) -> Result<bool, ValidationError> + Send + Sync>,
                Box<dyn Fn(Option<String>) -> Result<Vec<String>, ValidationError> + Send + Sync>
            >
        >
    > = {
        let domain_config_schema = Arc::new(RwLock::new(
            DomainConfigSchema::<
                Box<dyn Fn(Option<String>) -> Result<i64, ValidationError> + Send + Sync>,
                Box<dyn Fn(Option<String>) -> Result<String, ValidationError> + Send + Sync>,
                Box<dyn Fn(Option<String>) -> Result<bool, ValidationError> + Send + Sync>,
                Box<dyn Fn(Option<String>) -> Result<Vec<String>, ValidationError> + Send + Sync>
            >::new(
                Box::new(&positive_int_parse), 
                Box::new(&url_parse), 
                Box::new(&db_mode_parse), 
                Box::new(&db_url_parse),
                Box::new(&db_max_listeners),
                Box::new(&wallet_parse),
                Box::new(&truthy_parse),
                Box::new(&min_char_1_parse),
                Box::new(&array_parse)
            )
        ));
        domain_config_schema
    };
}

