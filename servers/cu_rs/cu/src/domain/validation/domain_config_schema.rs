use valid::{constraint::INVALID_DIGITS_INTEGER, invalid_value, ConstraintViolation, State, Validate, Validation, ValidationError};
use super::{parse_schema::StartSchemaParser, parse_url_parse_schema::UrlConstraint, positive_int_schema::PositiveIntSchemaConstraint, shared_validation::{parse_array_schema, parse_db_max_listeners_schema, parse_db_mode_schema, parse_db_url_schema, parse_min_char_one_schema, parse_truthy_schema, parse_wallet_schema}};
use super::positive_int_schema::parse_positive_int_schema;
use super::parse_url_parse_schema::parse_url_parse_schema;

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

impl StartSchemaParser<FinalDomainConfigSchema> for StartDomainConfigSchema {
    #[allow(non_snake_case)]
    fn parse(&self) -> Result<FinalDomainConfigSchema, ValidationError> {
        let mut final_domain_config_schema = FinalDomainConfigSchema::default();

        match parse_positive_int_schema(self.PROCESS_WASM_MEMORY_MAX_LIMIT.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_WASM_MEMORY_MAX_LIMIT = val,
            Err(e) => return Err(e)
        };
        
        match parse_positive_int_schema(self.PROCESS_WASM_COMPUTE_MAX_LIMIT.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_WASM_COMPUTE_MAX_LIMIT = val,
            Err(e) => return Err(e)
        };
        
        match parse_url_parse_schema(self.GATEWAY_URL.clone()) {
            Ok(val) => final_domain_config_schema.GATEWAY_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_url_parse_schema(self.UPLOADER_URL.clone()) {
            Ok(val) => final_domain_config_schema.UPLOADER_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_mode_schema(self.DB_MODE.clone()) {
            Ok(val) => final_domain_config_schema.DB_MODE = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_url_schema(self.DB_URL.clone()) {
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

        match parse_positive_int_schema(self.MEM_MONITOR_INTERVAL.clone()) {
            Ok(val) => final_domain_config_schema.MEM_MONITOR_INTERVAL = val,
            Err(e) => return Err(e)
        };
        
        match parse_positive_int_schema(self.PROCESS_CHECKPOINT_CREATION_THROTTLE.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_CHECKPOINT_CREATION_THROTTLE = val,
            Err(e) => return Err(e)
        };
        
        match parse_truthy_schema(self.DISABLE_PROCESS_CHECKPOINT_CREATION.clone()) {
            Ok(val) => final_domain_config_schema.DISABLE_PROCESS_CHECKPOINT_CREATION = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.EAGER_CHECKPOINT_THRESHOLD.clone()) {
            Ok(val) => final_domain_config_schema.EAGER_CHECKPOINT_THRESHOLD = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.WASM_EVALUATION_MAX_WORKERS.clone()) {
            Ok(val) => final_domain_config_schema.WASM_EVALUATION_MAX_WORKERS = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.WASM_INSTANCE_CACHE_MAX_SIZE.clone()) {
            Ok(val) => final_domain_config_schema.WASM_INSTANCE_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.WASM_MODULE_CACHE_MAX_SIZE.clone()) {
            Ok(val) => final_domain_config_schema.WASM_MODULE_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_min_char_one_schema(self.WASM_BINARY_FILE_DIRECTORY.clone()) {
            Ok(val) => final_domain_config_schema.WASM_BINARY_FILE_DIRECTORY = val,
            Err(e) => return Err(e)
        };
        match parse_array_schema(self.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS = val,
            Err(e) => return Err(e)
        };
        match parse_db_url_schema(self.PROCESS_CHECKPOINT_FILE_DIRECTORY.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_CHECKPOINT_FILE_DIRECTORY = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.PROCESS_MEMORY_CACHE_MAX_SIZE.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_MEMORY_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.PROCESS_MEMORY_CACHE_TTL.clone()) {
            Ok(val) => final_domain_config_schema.PROCESS_MEMORY_CACHE_TTL = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(self.BUSY_THRESHOLD.clone()) {
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
            violations.push(invalid_value(INVALID_DIGITS_INTEGER, "GATEWAY_URL", "".to_string(), "".to_string()));
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