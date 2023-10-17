use actix_web::{web, App, HttpResponse, HttpServer, Responder, HttpRequest};
use serde::Deserialize;
use su::domain::{write_message_pipeline, read_messages_pipeline};

async fn base() -> impl Responder {
    HttpResponse::Ok().body("ao sequencer unit")
}

async fn message_route(req_body: web::Bytes) -> impl Responder {
    let result = write_message_pipeline()
        .process_data(req_body.to_vec()).await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[derive(Deserialize)]
struct YourQueryParamsStruct {
    from: Option<String>,
    to: Option<String>,
}

#[derive(Deserialize)]
struct ProcessId {
    process_id: String,
}

async fn messages_route(req: HttpRequest, path: web::Path<ProcessId>, query_params: web::Query<YourQueryParamsStruct>) -> impl Responder {
    let process_id = Some(path.process_id.clone());
    let from_sort_key = query_params.from.clone();
    let to_sort_key = query_params.to.clone();

    let result = read_messages_pipeline()
        .process(process_id, from_sort_key, to_sort_key).await;
        
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
            .route("/message", web::post().to(message_route)) 
            .route("/messages/{process_id}", web::get().to(messages_route))
    })
    .bind(("127.0.0.1", 9000))?
    .run()
    .await
}
