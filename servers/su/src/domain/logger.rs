use std::sync::Arc;

use env_logger::Env;
use log::{error, info};

use crate::domain::Log;

pub struct SuLog;

/*
Logging instance, using an instance of this
instead of the env_logger macros throughout
the code
*/

impl SuLog {
    pub fn init() -> Arc<dyn Log> {
        env_logger::init_from_env(Env::default().default_filter_or("info"));
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
