pub mod app;
pub mod config;
pub mod domain {
    pub mod index;
    pub mod client {
        pub mod arweave;
    }
    // pub mod model;
    pub mod validation {
        pub mod domain_config_schema;
        pub mod shared_validation;
        pub mod stream_validation;
        pub mod parse_schema;
        pub mod server_config_schema;
        pub mod positive_int_schema;
        pub mod url_parse_schema;
        pub mod db_mode_schema;
        pub mod db_max_listeners_schema;
        pub mod truthy_schema;
        pub mod uuid_array_schema;
    }
    pub mod model;
}
pub mod env_vars;
pub mod utils {
    pub mod datetime;
    pub mod string_converters;
    pub mod paths;
}
pub mod routes {
    pub mod index;
}

use crate::app::server;

pub async fn run() -> std::io::Result<()> {
    server().await
}