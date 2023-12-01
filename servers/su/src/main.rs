use std::sync::Arc;

use actix_web::{web, App, HttpResponse, HttpServer, Responder, HttpRequest, middleware::Logger};
use serde::Deserialize;

use su::domain::{flows, StoreClient, Deps, Log};

use su::logger::{SuLog};

async fn base() -> impl Responder {
    HttpResponse::Ok().body("ao sequencer unit")
}

async fn timestamp_route() -> impl Responder {
    let result = flows::timestamp().await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn message_route(deps: web::Data<Arc<Deps>>, req_body: web::Bytes) -> impl Responder {
    let result = flows::write_message(deps.get_ref().clone(), req_body.to_vec()).await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[derive(Deserialize)]
struct FromTo {
    from: Option<String>,
    to: Option<String>,
}

#[derive(Deserialize)]
struct ProcessId {
    process_id: String,
}

async fn messages_route(deps: web::Data<Arc<Deps>>, _req: HttpRequest, path: web::Path<ProcessId>, query_params: web::Query<FromTo>) -> impl Responder {
    let process_id = path.process_id.clone();
    let from_sort_key = query_params.from.clone();
    let to_sort_key = query_params.to.clone();

    let result = flows::read_messages(deps.get_ref().clone(), process_id, from_sort_key, to_sort_key).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[derive(Deserialize)]
struct MessageId {
    message_id: String,
}

async fn read_message_route(deps: web::Data<Arc<Deps>>, _req: HttpRequest, path: web::Path<MessageId>, _query_params: web::Query<FromTo>) -> impl Responder {
    let message_id = path.message_id.clone();

    let result = flows::read_message(deps.get_ref().clone(), message_id).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn process_route(deps: web::Data<Arc<Deps>>, req_body: web::Bytes) -> impl Responder {
    let result = flows::write_process(deps.get_ref().clone(), req_body.to_vec()).await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn read_process_route(deps: web::Data<Arc<Deps>>, _req: HttpRequest, path: web::Path<ProcessId>) -> impl Responder {
    let process_id = path.process_id.clone();

    let result = flows::read_process(deps.get_ref().clone(), process_id).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let logger: Arc<dyn Log> = SuLog::init();
    let data_store = Arc::new(StoreClient::new().expect("Failed to create StoreClient"));
    let deps: Deps = Deps {
        data_store,
        logger
    };
    let wrapped = web::Data::new(Arc::new(deps));

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(wrapped.clone())
            .route("/", web::get().to(base))
            .route("/timestamp", web::get().to(timestamp_route))
            .route("/message", web::post().to(message_route)) 
            .route("/messages/{process_id}", web::get().to(messages_route))
            .route("/message/{message_id}", web::get().to(read_message_route))
            .route("/process", web::post().to(process_route)) 
            .route("/processes/{process_id}", web::get().to(read_process_route))
    })
    .bind(("0.0.0.0", 9000))?
    .run()
    .await
}
