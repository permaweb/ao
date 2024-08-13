use std::sync::Arc;

use tokio::task::spawn_blocking;

mod clients;
pub mod config;
mod core;
mod logger;

use clients::{
    gateway::ArweaveGateway, signer::ArweaveSigner, store, uploader::UploaderClient,
    wallet::FileWallet,
};
use config::AoConfig;
use core::dal::{Config, Gateway, Log};
use logger::SuLog;

pub use clients::metrics::PromMetrics;
pub use core::flows;
pub use core::router;
pub use flows::Deps;
pub use store::migrate_to_disk;

pub async fn init_deps(mode: Option<String>, metrics_registry: prometheus::Registry) -> Arc<Deps> {
    let logger: Arc<dyn Log> = SuLog::init();

    let data_store = Arc::new(store::StoreClient::new().expect("Failed to create StoreClient"));
    let d_clone = data_store.clone();

    match data_store.run_migrations() {
        Ok(m) => logger.log(m),
        Err(e) => logger.log(format!("{:?}", e)),
    }

    let config = Arc::new(AoConfig::new(mode.clone()).expect("Failed to read configuration"));

    if config.use_disk && config.mode != "router" {
        let logger_clone = logger.clone();
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
        data_store: data_store.clone(),
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
        metrics_registry,
    ));

    Arc::new(Deps {
        data_store,
        logger,
        config,
        scheduler,
        gateway,
        signer,
        wallet,
        uploader,
        metrics,
    })
}
