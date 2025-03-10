use core::dal::RouterDataStore;
use std::sync::Arc;

use tokio::task::spawn_blocking;

mod clients;
pub mod config;
mod core;
mod logger;

use clients::{
    gateway::ArweaveGateway, local_store, signer::ArweaveSigner, store, uploader::UploaderClient,
    wallet::FileWallet,
};
use config::AoConfig;
use core::dal::{Config, DataStore, Gateway, Log, MockRouterDataStore};
use logger::SuLog;

pub use clients::metrics::PromMetrics;
pub use core::flows;
pub use core::router;
pub use flows::Deps;
pub use local_store::migration::migrate_to_local;
pub use local_store::sync_local::sync_local_drives;
pub use store::migrate_to_disk;

pub async fn init_deps(mode: Option<String>) -> (Arc<Deps>, Arc<PromMetrics>) {
    let logger: Arc<dyn Log> = SuLog::init();

    let config = Arc::new(AoConfig::new(mode.clone()).expect("Failed to read configuration"));

    let data_store = if !config.use_local_store {
        let ds = Arc::new(store::StoreClient::new().expect("Failed to create StoreClient"));
        match ds.run_migrations() {
            Ok(m) => logger.log(m),
            Err(e) => logger.log(format!("{:?}", e)),
        }
        Some(ds)
    } else {
        None
    };

    let router_data_store: Arc<dyn RouterDataStore> = if !config.use_local_store {
        data_store.clone().unwrap().clone()
    } else {
        Arc::new(MockRouterDataStore {}) as Arc<dyn RouterDataStore>
    };

    let main_data_store: Arc<dyn DataStore> = if config.use_local_store {
        Arc::new(
            local_store::store::LocalStoreClient::new(
                &config.su_file_db_dir,
                &config.su_index_db_dir,
            )
            .expect("Failed to create LocalStoreClient"),
        ) as Arc<dyn DataStore>
    } else {
        data_store.clone().unwrap().clone()
    };

    if config.use_disk && config.mode != "router" {
        let logger_clone = logger.clone();
        let d_clone = data_store.clone().unwrap().clone();
        /*
          sync_bytestore is a blocking routine so we must
          call spawn_blocking or the server wont start until
          its complete and we want to do it in the background
        */
        spawn_blocking(move || {
            if let Err(e) = d_clone.sync_bytestore() {
                logger_clone.log(format!("Failed to migrate tail messages: {:?}", e));
            } else {
                logger_clone.log("Successfully migrated tail messages".to_string());
            }
        });
    }

    let scheduler_deps = Arc::new(core::scheduler::SchedulerDeps {
        data_store: main_data_store.clone(),
        logger: logger.clone(),
    });
    let scheduler = Arc::new(core::scheduler::ProcessScheduler::new(scheduler_deps));

    let gateway: Arc<dyn Gateway> = Arc::new(
        ArweaveGateway::new()
            .await
            .expect("Failed to initialize gateway"),
    );

    let signer =
        Arc::new(ArweaveSigner::new(&config.su_wallet_path).expect("Invalid su wallet path"));

    let wallet = Arc::new(FileWallet);

    let uploader = Arc::new(
        UploaderClient::new(&config.upload_node_url, logger.clone()).expect("Invalid uploader url"),
    );

    let metrics = Arc::new(PromMetrics::new(
        AoConfig::new(mode).expect("Failed to read configuration"),
    ));
    let metrics_clone = metrics.clone();

    (
        Arc::new(Deps {
            data_store: main_data_store,
            router_data_store,
            logger,
            config,
            scheduler,
            gateway,
            signer,
            wallet,
            uploader,
            metrics,
        }),
        metrics_clone,
    )
}
