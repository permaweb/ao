use std::sync::{Arc, Once};

use env_logger::Env;
use log::{error, info};

use crate::domain::Log;

pub struct SuLog;

static INIT: Once = Once::new();

impl SuLog {
    pub fn init() -> Arc<dyn Log> {
        INIT.call_once(|| {
            env_logger::init_from_env(Env::default().default_filter_or("info"));
        });
        Arc::new(SuLog {})
    }
}

impl Log for SuLog {
    fn log(&self, message: String) {
        info!("{}", message);
    }

    fn error(&self, message: String) {
        error!("{}", message);
    }
}
