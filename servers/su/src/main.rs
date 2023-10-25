use std::time::{SystemTime, UNIX_EPOCH, SystemTimeError};

use actix_web::{web, App, HttpResponse, HttpServer, Responder, HttpRequest};
use serde::Deserialize;
use serde_json::json;

use reqwest::{Url};

use arweave_rs::network::NetworkInfoClient;

use su::domain::{write_message_pipeline, read_messages_pipeline, read_message_pipeline};


fn system_time() -> Result<String, SystemTimeError> {
    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    let millis_string = millis.to_string();
    Ok(millis_string)
}

async fn base() -> impl Responder {
    HttpResponse::Ok().body("ao sequencer unit")
}

async fn timestamp_route() -> impl Responder {
    match system_time() {
        Ok(timestamp) => {
            let gateway_url = "https://arweave.net".to_string();
            let url = Url::parse(&gateway_url).unwrap();

            let network_client = NetworkInfoClient::new(url);
            let network_info = network_client.network_info().await;
            match network_info {
                Ok(info) => {
                    let height = info.height.clone();
                    let height_string = format!("{:0>12}", height);
                    let response_json = json!({ "timestamp": timestamp, "block_height": height_string });
                    HttpResponse::Ok()
                        .content_type("application/json")
                        .json(response_json) // Serialize the JSON object as a response
                },
                Err(_) => {
                    HttpResponse::InternalServerError().finish()
                }
            }
            
        }
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
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

async fn messages_route(_req: HttpRequest, path: web::Path<ProcessId>, query_params: web::Query<YourQueryParamsStruct>) -> impl Responder {
    let process_id = path.process_id.clone();
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

#[derive(Deserialize)]
struct MessageId {
    message_id: String,
}

async fn read_message_route(_req: HttpRequest, path: web::Path<MessageId>, query_params: web::Query<YourQueryParamsStruct>) -> impl Responder {
    let message_id = path.message_id.clone();

    let result = read_message_pipeline()
        .process(message_id).await;
        
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
    })
    .bind(("0.0.0.0", 9000))?
    .run()
    .await
}
