use std::env;
use dotenv::dotenv;
use once_cell::sync::OnceCell;
use valid::ValidationError;
use crate::{
    domain::validation::{domain_config_schema::StartDomainConfigSchema, parse_schema::StartSchemaParser, server_config_schema::{DevOrProd, FinalServerConfigSchema, StartServerConfigSchema}}, 
    utils::{datetime::{get_ms_from_hour, get_ms_from_sec}, paths::get_path_as_string}
};
use std::env::temp_dir;

/**
 * @type {z.infer<typeof serverConfigSchema>}
 *
 * We get some nice Intellisense by defining the type in JSDoc
 * before parsing with the serverConfig schema
 */
pub static CONFIG_ENVS: OnceCell<StartConfigEnvSet> = OnceCell::new();

#[allow(non_snake_case)]
pub fn get_config_env(development: bool) -> StartConfigEnv {
    dotenv().ok();

    let MODE = env::var("NODE_CONFIG_ENV").unwrap_or("".to_string());

    if MODE.len() == 0 { panic!("NODE_CONFIG_ENV must be defined"); }

    let envs = CONFIG_ENVS.get_or_init(|| StartConfigEnvSet {
        development: StartConfigEnv {
            MODE: Some(MODE.clone()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.is_empty().then_some("6363".to_string()).or(Some(p)))
                .or(Some("6363".to_string())),
            DUMP_PATH: env::var("DUMP_PATH")
                .ok()
                .and_then(|dp| dp.is_empty().then_some("./static".to_string()).or(Some(dp)))
                .or(Some("./static".to_string())),
            GATEWAY_URL: env::var("GATEWAY_URL")
                .ok()
                .and_then(|gu| gu.is_empty().then_some("https://arweave.net".to_string()).or(Some(gu)))
                .or(Some("https://arweave.net".to_string())),
            UPLOADER_URL: env::var("UPLOADER_URL")
                .ok()
                .and_then(|uu| uu.is_empty().then_some("https://up.arweave.net".to_string()).or(Some(uu)))
                .or(Some("https://up.arweave.net".to_string())),
            DB_MODE: env::var("DB_MODE")
                .ok()
                .and_then(|db| db.is_empty().then_some("embedded".to_string()).or(Some(db)))
                .or(Some("embedded".to_string())),
            DB_URL: env::var("DB_URL")
                .ok()
                .and_then(|du| du.is_empty().then_some("ao-cache".to_string()).or(Some(du)))
                .or(Some("ao-cache".to_string())), // todo: need to see how this is used
            DB_MAX_LISTENERS: env::var("DB_MAX_LISTENERS")
                .ok()
                .and_then(|dml| 
                    dml.is_empty()
                        .then_some("100".to_string())
                        .or(
                            dml.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("100".to_string()))
                        )
                )
                .or(Some("100".to_string())),
            WALLET: env::var("WALLET")
                .ok()                
                .or(None),
            WALLET_FILE: env::var("WALLET_FILE")
                .ok()                
                .or(None),
            MEM_MONITOR_INTERVAL: env::var("MEM_MONITOR_INTERVAL")
                .ok()
                .and_then(|mmi| 
                    mmi.is_empty()
                        .then_some(get_ms_from_sec(10).to_string())
                        .or(
                            mmi.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some(get_ms_from_sec(10).to_string()))
                        )
                )
                .or(Some(get_ms_from_sec(10).to_string())),
            PROCESS_CHECKPOINT_CREATION_THROTTLE: env::var("PROCESS_CHECKPOINT_CREATION_THROTTLE")
                .ok()
                .and_then(|pc|
                    pc.is_empty()
                        .then_some(get_ms_from_hour(24).to_string())
                        .or(
                            pc.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some(get_ms_from_hour(24).to_string()))
                        )    
                )
                .or(Some(get_ms_from_hour(24).to_string())),
            DISABLE_PROCESS_CHECKPOINT_CREATION: if env::var("DISABLE_PROCESS_CHECKPOINT_CREATION")
                .ok()
                .and_then(|dp|
                    dp.is_empty()
                        .then_some(false)
                        .or(
                            dp.parse::<bool>()
                                .ok()
                                .and_then(|val| Some(val))
                                .or(Some(false))
                        )
                )
                .or(Some(false)) != Some(false) {
                        Some("true".to_string())
                } else {
                    Some("false".to_string())
                }, // TODO: disabled by default for now. Enable by default later
            EAGER_CHECKPOINT_THRESHOLD: env::var("EAGER_CHECKPOINT_THRESHOLD")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("100".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("100".to_string()))
                        )
                )
                .or(Some("100".to_string())),
            PROCESS_WASM_MEMORY_MAX_LIMIT: env::var("PROCESS_WASM_MEMORY_MAX_LIMIT")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("1_000_000_000".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("1_000_000_000".to_string()))
                        )
                )
                .or(Some("1_000_000_000".to_string())), // 1GB
            PROCESS_WASM_COMPUTE_MAX_LIMIT: env::var("PROCESS_WASM_COMPUTE_MAX_LIMIT")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("9_000_000_000".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("9_000_000_000".to_string()))
                        )
                )
                .or(Some("9_000_000_000".to_string())), // 9b
            WASM_EVALUATION_MAX_WORKERS: env::var("WASM_EVALUATION_MAX_WORKERS")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("3".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("3".to_string()))
                        )
                )
                .or(Some("3".to_string())),
            WASM_INSTANCE_CACHE_MAX_SIZE: env::var("WASM_INSTANCE_CACHE_MAX_SIZE")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("5".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("5".to_string()))
                        )
                )
                .or(Some("5".to_string())), // 5 loaded wasm modules
            WASM_MODULE_CACHE_MAX_SIZE: env::var("WASM_MODULE_CACHE_MAX_SIZE")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("5".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("5".to_string()))
                        )
                )
                .or(Some("5".to_string())), // 5 wasm binaries
            WASM_BINARY_FILE_DIRECTORY: env::var("WASM_BINARY_FILE_DIRECTORY")
                .ok()
                .and_then(|wb| 
                    wb.is_empty()
                        .then_some(get_path_as_string(temp_dir()))
                        .or(Some(wb))
                )
                .or(Some(get_path_as_string(temp_dir()))),
            PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: env::var("PROCESS_IGNORE_ARWEAVE_CHECKPOINTS") // this is a comma delimited list!
                .ok()
                .and_then(|pi|
                    pi.is_empty()
                        .then_some("".to_string())
                        .or(Some(pi))
                )
                .or(Some("".to_string())),
            PROCESS_CHECKPOINT_FILE_DIRECTORY: env::var("PROCESS_CHECKPOINT_FILE_DIRECTORY")
                .ok()
                .and_then(|pc| 
                    pc.is_empty()
                        .then_some(get_path_as_string(temp_dir()))
                        .or(Some(pc))
                )
                .or(Some(get_path_as_string(temp_dir()))),
            PROCESS_MEMORY_CACHE_MAX_SIZE: env::var("PROCESS_MEMORY_CACHE_MAX_SIZE")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("500_000_000".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("500_000_000".to_string()))
                        )
                )
                .or(Some("500_000_000".to_string())), // 500MB
            PROCESS_MEMORY_CACHE_TTL: env::var("PROCESS_MEMORY_CACHE_TTL")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some(get_ms_from_hour(24).to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some(get_ms_from_hour(24).to_string()))
                        )
                )
                .or(Some(get_ms_from_hour(24).to_string())),
            BUSY_THRESHOLD: env::var("BUSY_THRESHOLD")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("0".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("0".to_string()))
                        )
                )
                .or(Some("0".to_string())) // disabled
        },
        production: StartConfigEnv {
            MODE: Some(MODE.clone()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.is_empty().then_some("6363".to_string()).or(Some(p)))
                .or(Some("6363".to_string())),
            DUMP_PATH: env::var("DUMP_PATH")
                .ok()
                .and_then(|dp| dp.is_empty().then_some(get_path_as_string(temp_dir())).or(Some(dp)))
                .or(Some(get_path_as_string(temp_dir()))),
            GATEWAY_URL: env::var("GATEWAY_URL")
                .ok()
                .and_then(|gu| gu.is_empty().then_some("https://arweave.net".to_string()).or(Some(gu)))
                .or(Some("https://arweave.net".to_string())),
            UPLOADER_URL: env::var("UPLOADER_URL")
                .ok()
                .and_then(|uu| uu.is_empty().then_some("https://up.arweave.net".to_string()).or(Some(uu)))
                .or(Some("https://up.arweave.net".to_string())),
            DB_MODE: env::var("DB_MODE")
                .ok()
                .and_then(|db| db.is_empty().then_some("embedded".to_string()).or(Some(db)))
                .or(Some("embedded".to_string())),
            DB_URL: env::var("DB_URL")
                .ok()
                .and_then(|du| du.is_empty().then_some("ao-cache".to_string()).or(Some(du)))
                .or(Some("ao-cache".to_string())), // todo: need to see how this is used
            DB_MAX_LISTENERS: env::var("DB_MAX_LISTENERS")
                .ok()
                .and_then(|dml| 
                    dml.is_empty()
                        .then_some("100".to_string())
                        .or(
                            dml.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("100".to_string()))
                        )
                )
                .or(Some("100".to_string())),
            WALLET: env::var("WALLET")
                .ok()                
                .or(None),
            WALLET_FILE: env::var("WALLET_FILE")
                .ok()                
                .or(None),
            MEM_MONITOR_INTERVAL: env::var("MEM_MONITOR_INTERVAL")
                .ok()
                .and_then(|mmi| 
                    mmi.is_empty()
                        .then_some(get_ms_from_sec(30).to_string())
                        .or(
                            mmi.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some(get_ms_from_sec(30).to_string()))
                        )
                )
                .or(Some(get_ms_from_sec(30).to_string())),
            PROCESS_CHECKPOINT_CREATION_THROTTLE: env::var("PROCESS_CHECKPOINT_CREATION_THROTTLE")
                .ok()
                .and_then(|pc|
                    pc.is_empty()
                        .then_some(get_ms_from_hour(24).to_string())
                        .or(
                            pc.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some(get_ms_from_hour(24).to_string()))
                        )    
                )
                .or(Some(get_ms_from_hour(24).to_string())),
            DISABLE_PROCESS_CHECKPOINT_CREATION: if env::var("DISABLE_PROCESS_CHECKPOINT_CREATION")
                    .ok()
                    .and_then(|dp|
                        dp.is_empty()
                            .then_some(false)
                            .or(
                                dp.parse::<bool>()
                                    .ok()
                                    .and_then(|val| Some(val))
                                    .or(Some(false))
                            )
                    )
                    .or(Some(false)) != Some(false) {
                        Some("true".to_string())
                } else {
                    Some("false".to_string())
                }, // TODO: disabled by default for now. Enable by default later
            EAGER_CHECKPOINT_THRESHOLD: env::var("EAGER_CHECKPOINT_THRESHOLD")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("100".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("100".to_string()))
                        )
                )
                .or(Some("100".to_string())),
            PROCESS_WASM_MEMORY_MAX_LIMIT: env::var("PROCESS_WASM_MEMORY_MAX_LIMIT")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("1_000_000_000".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("1_000_000_000".to_string()))
                        )
                )
                .or(Some("1_000_000_000".to_string())), // 1GB
            PROCESS_WASM_COMPUTE_MAX_LIMIT: env::var("PROCESS_WASM_COMPUTE_MAX_LIMIT")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("9_000_000_000".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("9_000_000_000".to_string()))
                        )
                )
                .or(Some("9_000_000_000".to_string())), // 9b
            WASM_EVALUATION_MAX_WORKERS: env::var("WASM_EVALUATION_MAX_WORKERS")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("3".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("3".to_string()))
                        )
                )
                .or(Some("3".to_string())),
            WASM_INSTANCE_CACHE_MAX_SIZE: env::var("WASM_INSTANCE_CACHE_MAX_SIZE")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("5".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("5".to_string()))
                        )
                )
                .or(Some("5".to_string())), // 5 loaded wasm modules
            WASM_MODULE_CACHE_MAX_SIZE: env::var("WASM_MODULE_CACHE_MAX_SIZE")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("5".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("5".to_string()))
                        )
                )
                .or(Some("5".to_string())), // 5 wasm binaries
            WASM_BINARY_FILE_DIRECTORY: env::var("WASM_BINARY_FILE_DIRECTORY")
                .ok()
                .and_then(|wb| 
                    wb.is_empty()
                        .then_some(get_path_as_string(temp_dir()))
                        .or(Some(wb))
                )
                .or(Some(get_path_as_string(temp_dir()))),
            PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: env::var("PROCESS_IGNORE_ARWEAVE_CHECKPOINTS") // this is a comma delimited list!
                .ok()
                .and_then(|pi|
                    pi.is_empty()
                        .then_some("".to_string())
                        .or(Some(pi))
                )
                .or(Some("".to_string())),
            PROCESS_CHECKPOINT_FILE_DIRECTORY: env::var("PROCESS_CHECKPOINT_FILE_DIRECTORY")
                .ok()
                .and_then(|pc| 
                    pc.is_empty()
                        .then_some(get_path_as_string(temp_dir()))
                        .or(Some(pc))
                )
                .or(Some(get_path_as_string(temp_dir()))),
            PROCESS_MEMORY_CACHE_MAX_SIZE: env::var("PROCESS_MEMORY_CACHE_MAX_SIZE")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("500_000_000".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("500_000_000".to_string()))
                        )
                )
                .or(Some("500_000_000".to_string())), // 500MB
            PROCESS_MEMORY_CACHE_TTL: env::var("PROCESS_MEMORY_CACHE_TTL")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some(get_ms_from_hour(24).to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some(get_ms_from_hour(24).to_string()))
                        )
                )
                .or(Some(get_ms_from_hour(24).to_string())),
            BUSY_THRESHOLD: env::var("BUSY_THRESHOLD")
                .ok()
                .and_then(|ec| 
                    ec.is_empty()
                        .then_some("0".to_string())
                        .or(
                            ec.parse::<i64>()
                                .ok()
                                .and_then(|val| Some(val.to_string()))
                                .or(Some("0".to_string()))
                        )
                )
                .or(Some("0".to_string())) // disabled
        }        
    });

    match development {
        true => envs.development.clone(),
        false => envs.production.clone()
    }
}

pub struct StartConfigEnvSet {
    pub development: StartConfigEnv,
    pub production: StartConfigEnv
}

#[allow(non_snake_case)]
#[derive(Clone)]
pub struct StartConfigEnv {
    pub MODE: Option<String>,
    pub port: Option<String>, // process.env.PORT || 6363,
    pub GATEWAY_URL: Option<String>, // process.env.GATEWAY_URL || 'https://arweave.net',
    pub UPLOADER_URL: Option<String>, // process.env.UPLOADER_URL || 'https://up.arweave.net',
    pub DB_MODE: Option<String>, // process.env.DB_MODE || 'embedded',
    pub DB_URL: Option<String>, // process.env.DB_URL || 'ao-cache',
    pub DB_MAX_LISTENERS: Option<String>, // parseInt(process.env.DB_MAX_LISTENERS || '100'),
    pub DUMP_PATH: Option<String>, // process.env.DUMP_PATH || './static',
    pub  WALLET: Option<String>, // process.env.WALLET,
    pub WALLET_FILE: Option<String>, // process.env.WALLET_FILE,
    pub MEM_MONITOR_INTERVAL: Option<String>, // process.env.MEM_MONITOR_INTERVAL || ms('10s'),
    pub PROCESS_CHECKPOINT_CREATION_THROTTLE: Option<String>, // process.env.PROCESS_CHECKPOINT_CREATION_THROTTLE || ms('24h'),
    pub DISABLE_PROCESS_CHECKPOINT_CREATION: Option<String>, // process.env.DISABLE_PROCESS_CHECKPOINT_CREATION !== 'false',
    pub EAGER_CHECKPOINT_THRESHOLD: Option<String>, // process.env.EAGER_CHECKPOINT_THRESHOLD || 100,
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: Option<String>, // process.env.PROCESS_WASM_MEMORY_MAX_LIMIT || 1_000_000_000, // 1GB
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: Option<String>, // process.env.PROCESS_WASM_COMPUTE_MAX_LIMIT || 9_000_000_000, // 9b
    pub WASM_EVALUATION_MAX_WORKERS: Option<String>, // process.env.WASM_EVALUATION_MAX_WORKERS || 3,
    pub WASM_INSTANCE_CACHE_MAX_SIZE: Option<String>, // process.env.WASM_INSTANCE_CACHE_MAX_SIZE || 5, // 5 loaded wasm modules
    pub WASM_MODULE_CACHE_MAX_SIZE: Option<String>, // process.env.WASM_MODULE_CACHE_MAX_SIZE || 5, // 5 wasm binaries
    pub WASM_BINARY_FILE_DIRECTORY: Option<String>, // process.env.WASM_BINARY_FILE_DIRECTORY || tmpdir(),
    pub PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: Option<String>, // process.env.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS || [],
    pub PROCESS_CHECKPOINT_FILE_DIRECTORY: Option<String>, // process.env.PROCESS_CHECKPOINT_FILE_DIRECTORY || tmpdir(),
    pub PROCESS_MEMORY_CACHE_MAX_SIZE: Option<String>, // process.env.PROCESS_MEMORY_CACHE_MAX_SIZE || 500_000_000, // 500MB
    pub PROCESS_MEMORY_CACHE_TTL: Option<String>, // process.env.PROCESS_MEMORY_CACHE_TTL || ms('24h'),
    pub BUSY_THRESHOLD: Option<String>, // process.env.BUSY_THRESHOLD || 0 // disabled
}

#[allow(non_snake_case)]
pub struct ConfigEnv {
    pub MODE: String,
    pub port: u16, // process.env.PORT || 6363,
    pub DUMP_PATH: String, // process.env.DUMP_PATH || './static',
    pub GATEWAY_URL: String, // process.env.GATEWAY_URL || 'https://arweave.net',
    pub UPLOADER_URL: String, // process.env.UPLOADER_URL || 'https://up.arweave.net',
    pub DB_MODE: String, // process.env.DB_MODE || 'embedded',
    pub DB_URL: String, // process.env.DB_URL || 'ao-cache',
    pub DB_MAX_LISTENERS: i64, // parseInt(process.env.DB_MAX_LISTENERS || '100'),    
    pub WALLET: String, // process.env.WALLET,
    pub WALLET_FILE: String, // process.env.WALLET_FILE,
    pub MEM_MONITOR_INTERVAL: i64, // process.env.MEM_MONITOR_INTERVAL || ms('10s'),
    pub PROCESS_CHECKPOINT_CREATION_THROTTLE: i64, // process.env.PROCESS_CHECKPOINT_CREATION_THROTTLE || ms('24h'),
    pub DISABLE_PROCESS_CHECKPOINT_CREATION: bool, // process.env.DISABLE_PROCESS_CHECKPOINT_CREATION !== 'false',
    pub EAGER_CHECKPOINT_THRESHOLD: i64, // process.env.EAGER_CHECKPOINT_THRESHOLD || 100,
    pub PROCESS_WASM_MEMORY_MAX_LIMIT: i64, // process.env.PROCESS_WASM_MEMORY_MAX_LIMIT || 1_000_000_000, // 1GB
    pub PROCESS_WASM_COMPUTE_MAX_LIMIT: i64, // process.env.PROCESS_WASM_COMPUTE_MAX_LIMIT || 9_000_000_000, // 9b
    pub WASM_EVALUATION_MAX_WORKERS: i64, // process.env.WASM_EVALUATION_MAX_WORKERS || 3,
    pub WASM_INSTANCE_CACHE_MAX_SIZE: i64, // process.env.WASM_INSTANCE_CACHE_MAX_SIZE || 5, // 5 loaded wasm modules
    pub WASM_MODULE_CACHE_MAX_SIZE: i64, // process.env.WASM_MODULE_CACHE_MAX_SIZE || 5, // 5 wasm binaries
    pub WASM_BINARY_FILE_DIRECTORY: String, // process.env.WASM_BINARY_FILE_DIRECTORY || tmpdir(),
    pub PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: Vec<String>, // process.env.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS || [],
    pub PROCESS_CHECKPOINT_FILE_DIRECTORY: String, // process.env.PROCESS_CHECKPOINT_FILE_DIRECTORY || tmpdir(),
    pub PROCESS_MEMORY_CACHE_MAX_SIZE: i64, // process.env.PROCESS_MEMORY_CACHE_MAX_SIZE || 500_000_000, // 500MB
    pub PROCESS_MEMORY_CACHE_TTL: i64, // process.env.PROCESS_MEMORY_CACHE_TTL || ms('24h'),
    pub BUSY_THRESHOLD: i64, // process.env.BUSY_THRESHOLD || 0 // disabled
}

impl ConfigEnv {
    pub fn new(final_server_config: FinalServerConfigSchema) -> Self {
        ConfigEnv {
            MODE: if final_server_config.MODE == DevOrProd::Development { "development".to_string() } else { "production".to_string() },
            port: final_server_config.port,
            DUMP_PATH: final_server_config.DUMP_PATH,
            GATEWAY_URL: final_server_config.base.GATEWAY_URL,
            UPLOADER_URL: final_server_config.base.UPLOADER_URL,
            DB_MODE: final_server_config.base.DB_MODE,
            DB_URL: final_server_config.base.DB_URL,
            DB_MAX_LISTENERS: final_server_config.base.DB_MAX_LISTENERS,
            WALLET: final_server_config.base.WALLET,
            WALLET_FILE: "".to_string(),
            MEM_MONITOR_INTERVAL: final_server_config.base.MEM_MONITOR_INTERVAL,
            PROCESS_CHECKPOINT_CREATION_THROTTLE: final_server_config.base.PROCESS_CHECKPOINT_CREATION_THROTTLE,
            DISABLE_PROCESS_CHECKPOINT_CREATION: final_server_config.base.DISABLE_PROCESS_CHECKPOINT_CREATION,
            EAGER_CHECKPOINT_THRESHOLD: final_server_config.base.EAGER_CHECKPOINT_THRESHOLD,
            PROCESS_WASM_MEMORY_MAX_LIMIT: final_server_config.base.PROCESS_WASM_MEMORY_MAX_LIMIT,
            PROCESS_WASM_COMPUTE_MAX_LIMIT: final_server_config.base.PROCESS_WASM_COMPUTE_MAX_LIMIT,
            WASM_EVALUATION_MAX_WORKERS: final_server_config.base.WASM_EVALUATION_MAX_WORKERS,
            WASM_INSTANCE_CACHE_MAX_SIZE: final_server_config.base.WASM_INSTANCE_CACHE_MAX_SIZE,
            WASM_MODULE_CACHE_MAX_SIZE: final_server_config.base.WASM_MODULE_CACHE_MAX_SIZE,
            WASM_BINARY_FILE_DIRECTORY: final_server_config.base.WASM_BINARY_FILE_DIRECTORY,
            PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: final_server_config.base.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
            PROCESS_CHECKPOINT_FILE_DIRECTORY: final_server_config.base.PROCESS_CHECKPOINT_FILE_DIRECTORY,
            PROCESS_MEMORY_CACHE_MAX_SIZE: final_server_config.base.PROCESS_MEMORY_CACHE_MAX_SIZE,
            PROCESS_MEMORY_CACHE_TTL: final_server_config.base.PROCESS_MEMORY_CACHE_TTL,
            BUSY_THRESHOLD: final_server_config.base.BUSY_THRESHOLD
        }
    }
}

impl Default for ConfigEnv {
    fn default() -> Self {
        ConfigEnv {
            MODE: "".to_string(),
            port: 0,
            DUMP_PATH: "".to_string(),
            PROCESS_WASM_MEMORY_MAX_LIMIT: 0,
            PROCESS_WASM_COMPUTE_MAX_LIMIT: 0,
            GATEWAY_URL: "".to_string(),
            UPLOADER_URL: "".to_string(),
            DB_MODE: "".to_string(),
            DB_URL: "".to_string(),
            DB_MAX_LISTENERS: 0,
            WALLET: "".to_string(),
            WALLET_FILE: "".to_string(),
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

static CONFIG: OnceCell<Result<ConfigEnv, ValidationError>> = OnceCell::new();
pub fn get_server_config_schema<'a>(start_config: StartConfigEnv) -> &'a Result<ConfigEnv, ValidationError> {
    CONFIG.get_or_init(|| {
        let start_domain_config = StartDomainConfigSchema::new(start_config.clone());
        let start_server_config = StartServerConfigSchema::new(start_config, start_domain_config);
        
        match start_server_config.parse() {
            Ok(final_server_config) => {
                Ok(ConfigEnv::new(final_server_config))            
            },
            Err(e) => {
                Err(e)
            }
        }    
    })
}