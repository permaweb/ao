use actix_web::web::{Data, Path, Query};
use actix_web::{web::resource, Resource};
use actix_web::{web, Responder};
use serde::Deserialize;

use crate::app_state::AppState;

use super::middleware::with_error_handler::ErrorHandler;

pub fn with_state_routes() -> Resource {
    resource("/state/{process_id}")        
        .route(web::get().to(state_handler).wrap(ErrorHandler))
}

pub async fn state_handler(_app_data: Data<AppState>, query: Query<String>, path: Path<i64>) -> impl Responder {
    let _input = InputSchema {
        process_id: path.into_inner(),
        to: query.0
    };


    ""
}

#[allow(unused)]
#[derive(Deserialize)]
struct InputSchema {
    process_id: i64,
    to: String
}