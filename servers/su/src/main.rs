use std::sync::Arc;

use actix_web::{web, App, HttpResponse, HttpServer, Responder, HttpRequest};
use serde::Deserialize;

use su::domain::{flows, StoreClient};

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

async fn message_route(store_client: web::Data<Arc<StoreClient>>, req_body: web::Bytes) -> impl Responder {
    let result = flows::write_message(store_client.get_ref().clone(), req_body.to_vec()).await;

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

async fn messages_route(store_client: web::Data<Arc<StoreClient>>, _req: HttpRequest, path: web::Path<ProcessId>, query_params: web::Query<FromTo>) -> impl Responder {
    let process_id = path.process_id.clone();
    let from_sort_key = query_params.from.clone();
    let to_sort_key = query_params.to.clone();

    let result = flows::read_messages(store_client.get_ref().clone(), process_id, from_sort_key, to_sort_key).await;
        
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

async fn read_message_route(store_client: web::Data<Arc<StoreClient>>, _req: HttpRequest, path: web::Path<MessageId>, _query_params: web::Query<FromTo>) -> impl Responder {
    let message_id = path.message_id.clone();

    let result = flows::read_message(store_client.get_ref().clone(), message_id).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn process_route(store_client: web::Data<Arc<StoreClient>>, req_body: web::Bytes) -> impl Responder {
    let result = flows::write_process(store_client.get_ref().clone(), req_body.to_vec()).await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn read_process_route(store_client: web::Data<Arc<StoreClient>>, _req: HttpRequest, path: web::Path<ProcessId>) -> impl Responder {
    let process_id = path.process_id.clone();

    let result = flows::read_process(store_client.get_ref().clone(), process_id).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let store_client = StoreClient::new().expect("Failed to create StoreClient");
    let store_client_data = web::Data::new(Arc::new(store_client));

    HttpServer::new(move || {
        App::new()
            .app_data(store_client_data.clone())
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
