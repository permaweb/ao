

use actix_web::{web, App, HttpResponse, HttpServer, Responder, HttpRequest};
use serde::Deserialize;

use su::domain::{MessagePipeline, MessagesPipeline, ReadMessagePipeline, ProcessPipeline, ReadProcessPipeline, TimestampPipeline};


async fn base() -> impl Responder {
    HttpResponse::Ok().body("ao sequencer unit")
}

async fn timestamp_route() -> impl Responder {
    let mut pipeline = match TimestampPipeline::new() {
        Ok(p) => p,
        Err(err) => return HttpResponse::InternalServerError().body(err),
    };

    let result = pipeline
        .process().await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn message_route(req_body: web::Bytes) -> impl Responder {
    let mut pipeline = match MessagePipeline::new() {
        Ok(p) => p,
        Err(err) => return HttpResponse::InternalServerError().body(err),
    };

    let result = pipeline
        .process(req_body.to_vec()).await;

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

async fn messages_route(_req: HttpRequest, path: web::Path<ProcessId>, query_params: web::Query<FromTo>) -> impl Responder {
    let process_id = path.process_id.clone();
    let from_sort_key = query_params.from.clone();
    let to_sort_key = query_params.to.clone();

    let mut pipeline = match MessagesPipeline::new() {
        Ok(p) => p,
        Err(err) => return HttpResponse::InternalServerError().body(err),
    };

    let result = pipeline
        .process(process_id, from_sort_key, to_sort_key).await;
        
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

async fn read_message_route(_req: HttpRequest, path: web::Path<MessageId>, _query_params: web::Query<FromTo>) -> impl Responder {
    let message_id = path.message_id.clone();

    let mut pipeline = match ReadMessagePipeline::new() {
        Ok(p) => p,
        Err(err) => return HttpResponse::InternalServerError().body(err),
    };

    let result = pipeline
        .process(message_id).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn process_route(req_body: web::Bytes) -> impl Responder {
    let mut pipeline = match ProcessPipeline::new() {
        Ok(p) => p,
        Err(err) => return HttpResponse::InternalServerError().body(err),
    };

    let result = pipeline
        .process(req_body.to_vec()).await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn read_process_route(_req: HttpRequest, path: web::Path<ProcessId>) -> impl Responder {
    let process_id = path.process_id.clone();

    let mut pipeline = match ReadProcessPipeline::new() {
        Ok(p) => p,
        Err(err) => return HttpResponse::InternalServerError().body(err),
    };

    let result = pipeline
        .process(process_id).await;
        
    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
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
