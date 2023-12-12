use std::env;
use std::sync::Arc;
use std::io::{self, Error, ErrorKind};

use actix_web::{web, App, HttpResponse, HttpServer, Responder, HttpRequest, middleware::Logger, http::header::LOCATION};
use serde::Deserialize;

use su::domain::{flows, StoreClient, Deps, Log};
use su::logger::SuLog;
use su::config::Config;

#[derive(Deserialize)]
struct FromTo {
    from: Option<String>,
    to: Option<String>,
    #[serde(rename = "process-id")]
    process_id: Option<String>,
}

#[derive(Deserialize)]
struct TxId {
    tx_id: String,
}

#[derive(Deserialize)]
struct ProcessId {
    #[serde(rename = "process-id")]
    process_id: Option<String>,
}

#[derive(Deserialize)]
struct ProcessIdRequired {
    #[serde(rename = "process-id")]
    process_id: String,
}

async fn base(deps: web::Data<Arc<Deps>>, query_params: web::Query<ProcessId>, req: HttpRequest) -> impl Responder {
    let process_id = query_params.process_id.clone();

    match flows::redirect_process_id(deps.get_ref().clone(), process_id).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::PermanentRedirect().insert_header((LOCATION, target_url)).finish();
        },
        Ok(None) => (),
        Err(err) => { return HttpResponse::BadRequest().body(err.to_string()); }
    }

    match flows::health(deps.get_ref().clone()).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn timestamp_route(deps: web::Data<Arc<Deps>>, query_params: web::Query<ProcessId>, req: HttpRequest) -> impl Responder {
    let process_id = query_params.process_id.clone();

    match flows::redirect_process_id(deps.get_ref().clone(), process_id).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::PermanentRedirect().insert_header((LOCATION, target_url)).finish();
        },
        Ok(None) => (),
        Err(err) => { return HttpResponse::BadRequest().body(err.to_string()); }
    }

    match flows::timestamp(deps.get_ref().clone()).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn main_post_route(deps: web::Data<Arc<Deps>>, req_body: web::Bytes, req: HttpRequest) -> impl Responder {
    match flows::redirect_data_item(deps.get_ref().clone(), req_body.to_vec()).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::PermanentRedirect().insert_header((LOCATION, target_url)).finish();
        },
        Ok(None) => (),
        Err(err) => { return HttpResponse::BadRequest().body(err.to_string()); }
    }

    match flows::write_item(deps.get_ref().clone(), req_body.to_vec()).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn main_get_route(deps: web::Data<Arc<Deps>>, req: HttpRequest, path: web::Path<TxId>, query_params: web::Query<FromTo>) -> impl Responder {
    let tx_id = path.tx_id.clone();
    let from_sort_key = query_params.from.clone();
    let to_sort_key = query_params.to.clone();
    let process_id = query_params.process_id.clone();

    match flows::redirect_tx_id(deps.get_ref().clone(), tx_id.clone(), process_id.clone()).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::PermanentRedirect().insert_header((LOCATION, target_url)).finish();
        },
        Ok(None) => (),
        Err(err) => { return HttpResponse::BadRequest().body(err.to_string()); }
    }

    let result = flows::read_message_data(deps.get_ref().clone(), tx_id, from_sort_key, to_sort_key).await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

async fn read_process_route(deps: web::Data<Arc<Deps>>, req: HttpRequest, path: web::Path<ProcessIdRequired>) -> impl Responder {
    let process_id = path.process_id.clone();

    match flows::redirect_process_id(deps.get_ref().clone(), Some(process_id.clone())).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::PermanentRedirect().insert_header((LOCATION, target_url)).finish();
        },
        Ok(None) => (),
        Err(err) => { return HttpResponse::BadRequest().body(err.to_string()); }
    }
        
    match flows::read_process(deps.get_ref().clone(), process_id).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => HttpResponse::BadRequest().body(err),
    }
}

#[actix_web::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let mode = match args.get(1) {
        Some(m) => Some(m.clone()),
        None => None
    };

    let port = match args.get(2) {
        Some(port_str) => match port_str.parse::<u16>() {
            Ok(num) => num,
            Err(_) => {
                let err = Error::new(ErrorKind::InvalidInput, "Port number is not valid");
                return Err(err);
            }
        },
        None => {
            let err = Error::new(ErrorKind::InvalidInput, "Port argument not provided");
            return Err(err);
        }
    };

    let logger: Arc<dyn Log> = SuLog::init();
    let data_store = Arc::new(StoreClient::new().expect("Failed to create StoreClient"));
    let config = Arc::new(Config::new(mode).expect("Failed to read configuration"));
    let deps: Deps = Deps {
        data_store,
        logger,
        config
    };
    let wrapped = web::Data::new(Arc::new(deps));

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(wrapped.clone())
            .route("/", web::get().to(base))
            .route("/", web::post().to(main_post_route)) 
            .route("/timestamp", web::get().to(timestamp_route))
            .route("/{tx_id}", web::get().to(main_get_route))
            .route("/processes/{process_id}", web::get().to(read_process_route))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
