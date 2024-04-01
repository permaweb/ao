use valid::ValidationError;
use super::shared_validation::{parse_array_schema, parse_db_max_listeners_schema, parse_db_mode_schema, parse_db_url_schema, parse_min_char_one_schema, parse_positive_int_schema, parse_truthy_schema, parse_url_parse_schema, parse_wallet_schema};

#[allow(non_snake_case)]
pub struct StartDomainConfigSchema {
    /**
    * The maximum Memory-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: String,
    /**
    * The maximum Compute-Limit, in bytes, supported for ao processes
    *
    * ie. '1000' or '1_000'
    */
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: String,
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
    pub DB_MAX_LISTENERS: String,
    /**
    * The wallet for the CU
    */
    pub WALLET: String,
    /**
    * The interval, in milliseconds, at which to log memory usage on this CU.
    */
    pub MEM_MONITOR_INTERVAL: String,
    /**
    * The amount of time, in milliseconds, that the CU should wait before creating a process Checkpoint,
    * if it has already created a Checkpoint for that process.
    *
    * This is effectively a throttle on Checkpoint creation, for a given process
    */
    pub PROCESS_CHECKPOINT_CREATION_THROTTLE: String,
    /**
    * Whether to disable Process Checkpoint creation entirely. Great for when developing locally,
    * of for an ephemeral CU
    */
    pub DISABLE_PROCESS_CHECKPOINT_CREATION: String,
    /**
    * If an evaluation stream evaluates this amount of messages,
    * then it will immediately create a Checkpoint at the end of the
    * evaluation stream
    */
    pub EAGER_CHECKPOINT_THRESHOLD: String,
    /**
    * The number of workers to use for evaluating messages
    */
    pub WASM_EVALUATION_MAX_WORKERS: String,
    /**
    * The maximum size of the in-memory cache used for wasm instances
    */
    pub WASM_INSTANCE_CACHE_MAX_SIZE: String,
    /**
    * The maximum size of the in-memory cache used for Wasm modules
    */
    pub WASM_MODULE_CACHE_MAX_SIZE: String,
    /**
    * The directory to place wasm binaries downloaded from arweave.
    */
    pub WASM_BINARY_FILE_DIRECTORY: String,
    /**
    * An array of process ids that should not use Checkpoints
    * on Arweave.
    */
    pub PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: String,
    /**
    * The directory to cache Checkpoints created on Arweave
    */
    pub PROCESS_CHECKPOINT_FILE_DIRECTORY: String,
    /**
    * The maximum size, in bytes, of the cache used to cache the latest memory
    * evaluated for an ao process
    */
    pub PROCESS_MEMORY_CACHE_MAX_SIZE: String,
    /**
    * The time to live for a cache entry in the process latest memory cache.
    * An entries ttl is rest each time it is accessed
    */
    pub PROCESS_MEMORY_CACHE_TTL: String,
    /**
    * The amount of time in milliseconds, the CU should wait for evaluation to complete
    * before responding with a "busy" message to the client
    */
    pub BUSY_THRESHOLD: String
}

impl StartDomainConfigSchema {
    #[allow(non_snake_case)]
    pub fn validate_domain_config_schema(&self) -> Result<FinalDomainConfigSchema, ValidationError> {
        let mut final_domain_config_schema = FinalDomainConfigSchema::default();

        match parse_positive_int_schema(Some(self.PROCESS_WASM_MEMORY_MAX_LIMIT.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_WASM_MEMORY_MAX_LIMIT = val,
            Err(e) => return Err(e)
        };
        
        match parse_positive_int_schema(Some(self.PROCESS_WASM_COMPUTE_MAX_LIMIT.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_WASM_COMPUTE_MAX_LIMIT = val,
            Err(e) => return Err(e)
        };
        
        match parse_url_parse_schema(Some(self.GATEWAY_URL.clone())) {
            Ok(val) => final_domain_config_schema.GATEWAY_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_url_parse_schema(Some(self.UPLOADER_URL.clone())) {
            Ok(val) => final_domain_config_schema.UPLOADER_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_mode_schema(Some(self.DB_MODE.clone())) {
            Ok(val) => final_domain_config_schema.DB_MODE = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_url_schema(Some(self.DB_URL.clone())) {
            Ok(val) => final_domain_config_schema.DB_URL = val,
            Err(e) => return Err(e)
        };
        
        match parse_db_max_listeners_schema(Some(self.DB_MAX_LISTENERS.clone())) {
            Ok(val) => final_domain_config_schema.DB_MAX_LISTENERS = val,
            Err(e) => return Err(e)
        };
        
        match parse_wallet_schema(Some(self.WALLET.clone())) {
            Ok(val) => final_domain_config_schema.WALLET = val,
            Err(e) => return Err(e)
        };

        match parse_positive_int_schema(Some(self.MEM_MONITOR_INTERVAL.clone())) {
            Ok(val) => final_domain_config_schema.MEM_MONITOR_INTERVAL = val,
            Err(e) => return Err(e)
        };
        
        match parse_positive_int_schema(Some(self.PROCESS_CHECKPOINT_CREATION_THROTTLE.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_CHECKPOINT_CREATION_THROTTLE = val,
            Err(e) => return Err(e)
        };
        
        match parse_truthy_schema(Some(self.DISABLE_PROCESS_CHECKPOINT_CREATION.clone())) {
            Ok(val) => final_domain_config_schema.DISABLE_PROCESS_CHECKPOINT_CREATION = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.EAGER_CHECKPOINT_THRESHOLD.clone())) {
            Ok(val) => final_domain_config_schema.EAGER_CHECKPOINT_THRESHOLD = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.WASM_EVALUATION_MAX_WORKERS.clone())) {
            Ok(val) => final_domain_config_schema.WASM_EVALUATION_MAX_WORKERS = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.WASM_INSTANCE_CACHE_MAX_SIZE.clone())) {
            Ok(val) => final_domain_config_schema.WASM_INSTANCE_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.WASM_MODULE_CACHE_MAX_SIZE.clone())) {
            Ok(val) => final_domain_config_schema.WASM_MODULE_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_min_char_one_schema(Some(self.WASM_BINARY_FILE_DIRECTORY.clone())) {
            Ok(val) => final_domain_config_schema.WASM_BINARY_FILE_DIRECTORY = val,
            Err(e) => return Err(e)
        };
        match parse_array_schema(Some(self.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS = val,
            Err(e) => return Err(e)
        };
        match parse_db_url_schema(Some(self.PROCESS_CHECKPOINT_FILE_DIRECTORY.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_CHECKPOINT_FILE_DIRECTORY = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.PROCESS_MEMORY_CACHE_MAX_SIZE.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_MEMORY_CACHE_MAX_SIZE = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.PROCESS_MEMORY_CACHE_TTL.clone())) {
            Ok(val) => final_domain_config_schema.PROCESS_MEMORY_CACHE_TTL = val,
            Err(e) => return Err(e)
        };
        match parse_positive_int_schema(Some(self.BUSY_THRESHOLD.clone())) {
            Ok(val) => final_domain_config_schema.BUSY_THRESHOLD = val,
            Err(e) => return Err(e)
        };

        Ok(final_domain_config_schema)
    }
}

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