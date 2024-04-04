use actix_web::web::{Path, ServiceConfig};
use actix_web::{web::resource, Resource};
use actix_web::{web, HttpResponse, Responder};

use super::middleware::with_error_handler::ErrorHandler;

pub fn with_state_routes() -> Resource {
    resource("/state/{process_id}")        
        .route(web::get().to(state_handler).wrap(ErrorHandler))
}

pub async fn state_handler(_path: Path<i64>) -> impl Responder {
    ""
}