use std::sync::Arc;

mod clients;
mod config;
mod core;
mod logger;

use clients::{
    gateway::ArweaveGateway, signer::ArweaveSigner, store::StoreClient, uploader::UploaderClient,
    wallet::FileWallet,
};
use config::AoConfig;
use core::dal::{Config, Gateway, Log};
use logger::SuLog;

pub use core::flows;
pub use core::router;
pub use flows::Deps;

pub async fn init_deps(mode: Option<String>) -> Arc<Deps> {
    let logger: Arc<dyn Log> = SuLog::init();

    let data_store = Arc::new(StoreClient::new().expect("Failed to create StoreClient"));

    match data_store.run_migrations() {
        Ok(m) => logger.log(m),
        Err(e) => logger.log(format!("{:?}", e)),
    }

    let config = Arc::new(AoConfig::new(mode).expect("Failed to read configuration"));

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

    Arc::new(Deps {
        data_store,
        logger,
        config,
        scheduler,
        gateway,
        signer,
        wallet,
        uploader,
    })
}
