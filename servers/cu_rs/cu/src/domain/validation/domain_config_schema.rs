use valid::{constraint::{CharCount, NotEmpty, INVALID_CHAR_COUNT_MIN, INVALID_DIGITS_INTEGER}, invalid_value, ConstraintViolation, State, Validate, Validation, ValidationError};
use crate::config::ConfigEnv;

use super::{db_max_listeners_schema::IntegerConstraint, parse_schema::StartSchemaParser, positive_int_schema::PositiveIntSchemaConstraint, shared_validation::{parse_db_url_schema, parse_min_char_one_schema, parse_wallet_schema, INVALID_URL, INVALID_WALLET}, truthy_schema::{TruthyConstraint, INVALID_NOT_TRUTHY}, url_parse_schema::UrlConstraint, uuid_array_schema::{UuidArrayConstraint, INVALID_ARRAY}};
use super::positive_int_schema::parse_positive_int_schema;
use super::url_parse_schema::parse_url_parse_schema;
use super::db_mode_schema::parse_db_mode_schema;
use super::db_max_listeners_schema::parse_db_max_listeners_schema;
use super::truthy_schema::parse_truthy_schema;
use super::uuid_array_schema::parse_array_schema;
use std::env;
use dotenv::dotenv;

#[derive(Clone)]
#[allow(non_snake_case)]
pub struct StartDomainConfigSchema {
    /**
    * The maximum Memory-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: Option<String>,
    /**
    * The maximum Compute-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: Option<String>,
    /**
    * The gateway for the CU to use fetch block metadata, data on arweave,
    * and Scheduler-Location data
    */
    pub GATEWAY_URL: Option<String>,
    /**
    * The url of the uploader to use to upload Process Checkpoints to Arweave
    */
    pub UPLOADER_URL: Option<String>,
    /**
    * Whether the database being used by the CU is embedded within the CU (ie. PouchDB)
    * or is on another remote process (ie. CouchDB)
    */
    pub DB_MODE: Option<String>,
    /**
    * The connection string to the database
    */
    pub DB_URL: Option<String>,
    /**
    * The maximum number of event listeners for the database
    */
    pub DB_MAX_LISTENERS: Option<String>,
    /**
    * The wallet for the CU
    */
    pub WALLET: Option<String>,
    /**
    * The interval, in milliseconds, at which to log memory usage on this CU.
    */
    pub MEM_MONITOR_INTERVAL: Option<String>,
    /**
    * The amount of time, in milliseconds, that the CU should wait before creating a process Checkpoint,
    * if it has already created a Checkpoint for that process.
    *
    * This is effectively a throttle on Checkpoint creation, for a given process
    */
    pub PROCESS_CHECKPOINT_CREATION_THROTTLE: Option<String>,
    /**
    * Whether to disable Process Checkpoint creation entirely. Great for when developing locally,
    * of for an ephemeral CU
    */
    pub DISABLE_PROCESS_CHECKPOINT_CREATION: Option<String>,
    /**
    * If an evaluation stream evaluates this amount of messages,
    * then it will immediately create a Checkpoint at the end of the
    * evaluation stream
    */
    pub EAGER_CHECKPOINT_THRESHOLD: Option<String>,
    /**
    * The number of workers to use for evaluating messages
    */
    pub WASM_EVALUATION_MAX_WORKERS: Option<String>,
    /**
    * The maximum size of the in-memory cache used for wasm instances
    */
    pub WASM_INSTANCE_CACHE_MAX_SIZE: Option<String>,
    /**
    * The maximum size of the in-memory cache used for Wasm modules
    */
    pub WASM_MODULE_CACHE_MAX_SIZE: Option<String>,
    /**
    * The directory to place wasm binaries downloaded from arweave.
    */
    pub WASM_BINARY_FILE_DIRECTORY: Option<String>,
    /**
    * An array of process ids that should not use Checkpoints
    * on Arweave.
    */
    pub PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: Option<String>,
    /**
    * The directory to cache Checkpoints created on Arweave
    */
    pub PROCESS_CHECKPOINT_FILE_DIRECTORY: Option<String>,
    /**
    * The maximum size, in bytes, of the cache used to cache the latest memory
    * evaluated for an ao process
    */
    pub PROCESS_MEMORY_CACHE_MAX_SIZE: Option<String>,
    /**
    * The time to live for a cache entry in the process latest memory cache.
    * An entries ttl is rest each time it is accessed
    */
    pub PROCESS_MEMORY_CACHE_TTL: Option<String>,
    /**
    * The amount of time in milliseconds, the CU should wait for evaluation to complete
    * before responding with a "busy" message to the client
    */
    pub BUSY_THRESHOLD: Option<String>
}

impl StartSchemaParser<FinalDomainConfigSchema> for ConfigEnv {
    #[allow(non_snake_case)]
    fn parse(&self) -> Result<FinalDomainConfigSchema, ValidationError> {
        let mut final_domain_config_schema = FinalDomainConfigSchema::default();

        match parse_positive_int_schema(self.PROCESS_WASM_MEMORY_MAX_LIMIT.clone(), "PROCESS_WASM_MEMORY_MAX_LIMIT") {
            Ok(val) => final_domain_config_schema.PROCESS_WASM_MEMORY_MAX_LIMIT = val,
            Err(e) => return Err(e)
        };
        
        match parse_positive_int_schema(self.PROCESS_WASM_COMPUTE_MAX_LIMIT.clone(), "PROCESS_WASM_COMPUTE_MAX_LIMIT") {
            Ok(val) => final_domain_config_schema.PROCESS_WASM_COMPUTE_MAX_LIMIT = val,
            Err(e) => return Err(e)
        };
        
        match parse_url_parse_schema(self.GATEWAY_URL.clone(), "GATEWAY_URL") {
            Ok(val) => final_domain_config_schema.GATEWAY_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_url_parse_schema(self.UPLOADER_URL.clone(), "UPLOADER_URL") {
            Ok(val) => final_domain_config_schema.UPLOADER_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_mode_schema(self.DB_MODE.clone()) {
            Ok(val) => final_domain_config_schema.DB_MODE = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_url_schema(self.DB_URL.clone(), "DB_URL") {
            Ok(val) => final_domain_config_schema.DB_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_max_listeners_schema(self.DB_MAX_LISTENERS.clone()) {
            Ok(val) => final_domain_config_schema.DB_MAX_LISTENERS = val,
            Err(e) => return Err(e)
        };
        
        match parse_wallet_schema(self.WALLET.clone()) {
            Ok(val) => final_domain_config_schema.WALLET = val,
            Err(e) => return Err(e)
        };

        match parse_positive_int_schema(self.MEM_MONITOR_INTERVAL.clone(), "MEM_MONITOR_INTERVAL") {
            Ok(val) => final_domain_config_schema.MEM_MONITOR_INTERVAL = val,
            Err(e) => return Err(e)
        };
        
        match parse_positive_int_schema(self.PROCESS_CHECKPOINT_CREATION_THROTTLE.clone(), "PROCESS_CHECKPOINT_CREATION_THROTTLE") {
            Ok(val) => final_domain_config_schema.PROCESS_CHECKPOINT_CREATION_THROTTLE = val,
            Err(e) => return Err(e)
        };
        
        match parse_truthy_schema(self.DISABLE_PROCESS_CHECKPOINT_CREATION.clone()) {
            Ok(val) => final_domain_config_schema.DISABLE_PROCESS_CHECKPOINT_CREATION = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.EAGER_CHECKPOINT_THRESHOLD.clone(), "EAGER_CHECKPOINT_THRESHOLD") {
            Ok(val) => final_domain_config_schema.EAGER_CHECKPOINT_THRESHOLD = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.WASM_EVALUATION_MAX_WORKERS.clone(), "WASM_EVALUATION_MAX_WORKERS") {
            Ok(val) => final_domain_config_schema.WASM_EVALUATION_MAX_WORKERS = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.WASM_INSTANCE_CACHE_MAX_SIZE.clone(), "WASM_INSTANCE_CACHE_MAX_SIZE") {
            Ok(val) => final_domain_config_schema.WASM_INSTANCE_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.WASM_MODULE_CACHE_MAX_SIZE.clone(), "WASM_MODULE_CACHE_MAX_SIZE") {
            Ok(val) => final_domain_config_schema.WASM_MODULE_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_min_char_one_schema(self.WASM_BINARY_FILE_DIRECTORY.clone(), "WASM_BINARY_FILE_DIRECTORY") {
            Ok(val) => final_domain_config_schema.WASM_BINARY_FILE_DIRECTORY = val,
            Err(e) => return Err(e)
        };
        match parse_array_schema(self.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS = val,
            Err(e) => return Err(e)
        };
        match parse_min_char_one_schema(self.PROCESS_CHECKPOINT_FILE_DIRECTORY.clone(), "PROCESS_CHECKPOINT_FILE_DIRECTORY") {
            Ok(val) => final_domain_config_schema.PROCESS_CHECKPOINT_FILE_DIRECTORY = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.PROCESS_MEMORY_CACHE_MAX_SIZE.clone(), "PROCESS_MEMORY_CACHE_MAX_SIZE") {
            Ok(val) => final_domain_config_schema.PROCESS_MEMORY_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.PROCESS_MEMORY_CACHE_TTL.clone(), "PROCESS_MEMORY_CACHE_TTL") {
            Ok(val) => final_domain_config_schema.PROCESS_MEMORY_CACHE_TTL = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.BUSY_THRESHOLD.clone(), "BUSY_THRESHOLD") {
            Ok(val) => final_domain_config_schema.BUSY_THRESHOLD = val,
            Err(e) => return Err(e)
        };

        Ok(final_domain_config_schema)
    }
}


pub struct StartDomainConfigSchemaConstraint;
pub struct StartDomainConfigSchemaState;

impl<'a> Validate<StartDomainConfigSchemaConstraint, State<&'a StartDomainConfigSchemaState>> for StartDomainConfigSchema {
    // todo: finish
    fn validate(self, _context: impl Into<State<&'a StartDomainConfigSchemaState>>, _constraint: &StartDomainConfigSchemaConstraint) -> Validation<StartDomainConfigSchemaConstraint, Self> {
        let mut violations: Vec<ConstraintViolation> = vec![];

        if self.clone().PROCESS_WASM_MEMORY_MAX_LIMIT.validate("PROCESS_WASM_MEMORY_MAX_LIMIT", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "PROCESS_WASM_MEMORY_MAX_LIMIT", "".to_string(), "".to_string()));
        }
        if self.clone().PROCESS_WASM_COMPUTE_MAX_LIMIT.validate("PROCESS_WASM_COMPUTE_MAX_LIMIT", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "PROCESS_WASM_COMPUTE_MAX_LIMIT", "".to_string(), "".to_string()));
        }
        if self.clone().GATEWAY_URL.validate("GATEWAY_URL", &UrlConstraint::new()).result().is_err() {
            violations.push(invalid_value(INVALID_URL, "GATEWAY_URL", "".to_string(), "".to_string()));
        }
        if self.clone().UPLOADER_URL.validate("UPLOADER_URL", &UrlConstraint::new()).result().is_err() {
            violations.push(invalid_value(INVALID_URL, "UPLOADER_URL", "".to_string(), "".to_string()));
        }
        if self.clone().DB_MODE.validate("DB_MODE", &UrlConstraint::new()).result().is_err() {
            violations.push(invalid_value(INVALID_URL, "DB_MODE", "".to_string(), "".to_string()));
        }
        if self.clone().DB_URL.validate("DB_URL", &NotEmpty).result().is_err()
            || self.clone().DB_URL.unwrap().validate("DB_URL", &CharCount::Min(1)).result().is_err() {
            violations.push(invalid_value(INVALID_URL, "DB_URL", "".to_string(), "".to_string()));
        }
        if self.clone().DB_MAX_LISTENERS.validate("DB_MAX_LISTENERS", &IntegerConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "DB_MAX_LISTENERS", "".to_string(), "".to_string()));
        }
        if self.clone().WALLET.validate("WALLET", &NotEmpty).result().is_err()
            || self.clone().WALLET.unwrap().validate("WALLET", &CharCount::Min(1)).result().is_err() {
            violations.push(invalid_value(INVALID_WALLET, "WALLET", "".to_string(), "".to_string()));
        }
        if self.clone().MEM_MONITOR_INTERVAL.validate("MEM_MONITOR_INTERVAL", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "MEM_MONITOR_INTERVAL", "".to_string(), "".to_string()));
        }
        if self.clone().PROCESS_CHECKPOINT_CREATION_THROTTLE.validate("PROCESS_CHECKPOINT_CREATION_THROTTLE", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "PROCESS_CHECKPOINT_CREATION_THROTTLE", "".to_string(), "".to_string()));
        }
        if self.clone().DISABLE_PROCESS_CHECKPOINT_CREATION.validate("DISABLE_PROCESS_CHECKPOINT_CREATION", &TruthyConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_NOT_TRUTHY, "DISABLE_PROCESS_CHECKPOINT_CREATION", "".to_string(), "".to_string()));
        }
        if self.clone().EAGER_CHECKPOINT_THRESHOLD.validate("EAGER_CHECKPOINT_THRESHOLD", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "EAGER_CHECKPOINT_THRESHOLD", "".to_string(), "".to_string()));
        }
        if self.clone().WASM_EVALUATION_MAX_WORKERS.validate("WASM_EVALUATION_MAX_WORKERS", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "WASM_EVALUATION_MAX_WORKERS", "".to_string(), "".to_string()));
        }
        if self.clone().WASM_INSTANCE_CACHE_MAX_SIZE.validate("WASM_INSTANCE_CACHE_MAX_SIZE", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "WASM_INSTANCE_CACHE_MAX_SIZE", "".to_string(), "".to_string()));
        }
        if self.clone().WASM_MODULE_CACHE_MAX_SIZE.validate("WASM_MODULE_CACHE_MAX_SIZE", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "WASM_MODULE_CACHE_MAX_SIZE", "".to_string(), "".to_string()));
        }
        if self.clone().WASM_BINARY_FILE_DIRECTORY.validate("WASM_BINARY_FILE_DIRECTORY", &NotEmpty).result().is_err()
            || self.clone().WASM_BINARY_FILE_DIRECTORY.unwrap().validate("WASM_BINARY_FILE_DIRECTORY", &CharCount::Min(1)).result().is_err() {
            violations.push(invalid_value(INVALID_CHAR_COUNT_MIN, "WASM_BINARY_FILE_DIRECTORY", "".to_string(), "".to_string()));
        }
        if self.clone().PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.validate("PROCESS_IGNORE_ARWEAVE_CHECKPOINTS", &UuidArrayConstraint::new()).result().is_err() {
            violations.push(invalid_value(INVALID_ARRAY, "PROCESS_IGNORE_ARWEAVE_CHECKPOINTS", "".to_string(), "".to_string()));
        }
        if self.clone().PROCESS_CHECKPOINT_FILE_DIRECTORY.validate("PROCESS_CHECKPOINT_FILE_DIRECTORY", &NotEmpty).result().is_err()
            || self.clone().DB_URL.unwrap().validate("PROCESS_CHECKPOINT_FILE_DIRECTORY", &CharCount::Min(1)).result().is_err() {
            violations.push(invalid_value(INVALID_CHAR_COUNT_MIN, "PROCESS_CHECKPOINT_FILE_DIRECTORY", "".to_string(), "".to_string()));
        }
        if self.clone().PROCESS_MEMORY_CACHE_MAX_SIZE.validate("PROCESS_MEMORY_CACHE_MAX_SIZE", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "PROCESS_MEMORY_CACHE_MAX_SIZE", "".to_string(), "".to_string()));
        }
        if self.clone().PROCESS_MEMORY_CACHE_TTL.validate("PROCESS_MEMORY_CACHE_TTL", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "PROCESS_MEMORY_CACHE_TTL", "".to_string(), "".to_string()));
        }
        if self.clone().BUSY_THRESHOLD.validate("BUSY_THRESHOLD", &PositiveIntSchemaConstraint).result().is_err() {
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "BUSY_THRESHOLD", "".to_string(), "".to_string()));
        }

        if violations.len() > 0 {
            return Validation::failure(violations);
        }
        Validation::success(self)
    }
}

#[derive(Clone)]
#[allow(non_snake_case)]
pub struct FinalDomainConfigSchema {
    /**
    * The maximum Memory-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: i64,
    /**
    * The maximum Compute-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: i64,
    /**
    * The gateway for the CU to use fetch block metadata, data on arweave,
    * and Scheduler-Location data
    */
    pub GATEWAY_URL: String,
    /**
    * The url of the uploader to use to upload Process Checkpoints to Arweave
    */
    pub UPLOADER_URL: String,
    /**
    * Whether the database being used by the CU is embedded within the CU (ie. PouchDB)
    * or is on another remote process (ie. CouchDB)
    */
    pub DB_MODE: String,
    /**
    * The connection string to the database
    */
    pub DB_URL: String,
    /**
    * The maximum number of event listeners for the database
    */
    pub DB_MAX_LISTENERS: i64,
    /**
    * The wallet for the CU
    */
    pub WALLET: String,
    /**
    * The interval, in milliseconds, at which to log memory usage on this CU.
    */
    pub MEM_MONITOR_INTERVAL: i64,
    /**
    * The amount of time, in milliseconds, that the CU should wait before creating a process Checkpoint,
    * if it has already created a Checkpoint for that process.
    *
    * This is effectively a throttle on Checkpoint creation, for a given process
    */
    pub PROCESS_CHECKPOINT_CREATION_THROTTLE: i64,
    /**
    * Whether to disable Process Checkpoint creation entirely. Great for when developing locally,
    * of for an ephemeral CU
    */
    pub DISABLE_PROCESS_CHECKPOINT_CREATION: bool,
    /**
    * If an evaluation stream evaluates this amount of messages,
    * then it will immediately create a Checkpoint at the end of the
    * evaluation stream
    */
    pub EAGER_CHECKPOINT_THRESHOLD: i64,
    /**
    * The number of workers to use for evaluating messages
    */
    pub WASM_EVALUATION_MAX_WORKERS: i64,
    /**
    * The maximum size of the in-memory cache used for wasm instances
    */
    pub WASM_INSTANCE_CACHE_MAX_SIZE: i64,
    /**
    * The maximum size of the in-memory cache used for Wasm modules
    */
    pub WASM_MODULE_CACHE_MAX_SIZE: i64,
    /**
    * The directory to place wasm binaries downloaded from arweave.
    */
    pub WASM_BINARY_FILE_DIRECTORY: String,
    /**
    * An array of process ids that should not use Checkpoints
    * on Arweave.
    */
    pub PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: Vec<String>,
    /**
    * The directory to cache Checkpoints created on Arweave
    */
    pub PROCESS_CHECKPOINT_FILE_DIRECTORY: String,
    /**
    * The maximum size, in bytes, of the cache used to cache the latest memory
    * evaluated for an ao process
    */
    pub PROCESS_MEMORY_CACHE_MAX_SIZE: i64,
    /**
    * The time to live for a cache entry in the process latest memory cache.
    * An entries ttl is rest each time it is accessed
    */
    pub PROCESS_MEMORY_CACHE_TTL: i64,
    /**
    * The amount of time in milliseconds, the CU should wait for evaluation to complete
    * before responding with a "busy" message to the client
    */
    pub BUSY_THRESHOLD: i64
}

impl Default for FinalDomainConfigSchema {
    fn default() -> Self {
        FinalDomainConfigSchema {
            PROCESS_WASM_MEMORY_MAX_LIMIT: 0,
            PROCESS_WASM_COMPUTE_MAX_LIMIT: 0,
            GATEWAY_URL: "".to_string(),
            UPLOADER_URL: "".to_string(),
            DB_MODE: "".to_string(),
            DB_URL: "".to_string(),
            DB_MAX_LISTENERS: 0,
            WALLET: "".to_string(),
            MEM_MONITOR_INTERVAL: 0,
            PROCESS_CHECKPOINT_CREATION_THROTTLE: 0,
            DISABLE_PROCESS_CHECKPOINT_CREATION: false,
            EAGER_CHECKPOINT_THRESHOLD: 0,
            WASM_EVALUATION_MAX_WORKERS: 0,
            WASM_INSTANCE_CACHE_MAX_SIZE: 0,
            WASM_MODULE_CACHE_MAX_SIZE: 0,
            WASM_BINARY_FILE_DIRECTORY: "".to_string(),
            PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: vec![],
            PROCESS_CHECKPOINT_FILE_DIRECTORY: "".to_string(),
            PROCESS_MEMORY_CACHE_MAX_SIZE: 0,
            PROCESS_MEMORY_CACHE_TTL: 0,
            BUSY_THRESHOLD: 0
        }
    }
}