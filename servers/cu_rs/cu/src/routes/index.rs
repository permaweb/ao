use actix_web::web::ServiceConfig;
use super::state::with_state_routes;

/// todo: need real paths
pub fn index(cfg: &mut ServiceConfig) {
    cfg.service(
        with_state_routes()
    );
}