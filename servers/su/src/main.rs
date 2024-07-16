use std::env;
use std::io::{self, Error, ErrorKind};
use std::sync::Arc;

use actix_cors::Cors;
use actix_web::{
    http::header::LOCATION, middleware::Logger, web, App, HttpRequest, HttpResponse, HttpServer,
    Responder,
};

use serde::Deserialize;
use serde_json::json;

use su::domain::{flows, init_deps, router, Deps};

#[derive(Deserialize)]
struct FromTo {
    from: Option<String>,
    to: Option<String>,
    limit: Option<i32>,
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
    process_id: String,
}

#[derive(Deserialize)]
struct OptionalAssign {
    #[serde(rename = "process-id")]
    process_id: Option<String>,
    assign: Option<String>,
    // base-layer is either present or not, it has no value
    #[serde(rename = "base-layer")]
    base_layer: Option<String>,
    exclude: Option<String>,
}

fn err_response(err: String) -> HttpResponse {
    let error_json = json!({ "error": err });
    HttpResponse::BadRequest()
        .content_type("application/json")
        .body(error_json.to_string())
}

async fn base(
    deps: web::Data<Arc<Deps>>,
    query_params: web::Query<ProcessId>,
    req: HttpRequest,
) -> impl Responder {
    let process_id = query_params.process_id.clone();

    match router::redirect_process_id(deps.get_ref().clone(), process_id).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::TemporaryRedirect()
                .insert_header((LOCATION, target_url))
                .finish();
        }
        Ok(None) => (),
        Err(err) => return err_response(err.to_string()),
    }

    match flows::health(deps.get_ref().clone()).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => err_response(err.to_string()),
    }
}

async fn timestamp_route(
    deps: web::Data<Arc<Deps>>,
    query_params: web::Query<ProcessId>,
    req: HttpRequest,
) -> impl Responder {
    let process_id = query_params.process_id.clone();

    match router::redirect_process_id(deps.get_ref().clone(), process_id).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::TemporaryRedirect()
                .insert_header((LOCATION, target_url))
                .finish();
        }
        Ok(None) => (),
        Err(err) => return err_response(err.to_string()),
    }

    match flows::timestamp(deps.get_ref().clone()).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => err_response(err.to_string()),
    }
}

async fn main_post_route(
    deps: web::Data<Arc<Deps>>,
    req_body: web::Bytes,
    req: HttpRequest,
    query_params: web::Query<OptionalAssign>,
) -> impl Responder {
    match router::redirect_data_item(
        deps.get_ref().clone(),
        req_body.to_vec(),
        query_params.process_id.clone(),
        query_params.assign.clone(),
    )
        .await
    {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::TemporaryRedirect()
                .insert_header((LOCATION, target_url))
                .finish();
        }
        Ok(None) => (),
        Err(err) => return err_response(err.to_string()),
    }

    match flows::write_item(
        deps.get_ref().clone(),
        req_body.to_vec(),
        query_params.process_id.clone(),
        query_params.assign.clone(),
        query_params.base_layer.clone(),
        query_params.exclude.clone(),
    )
        .await
    {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => err_response(err.to_string()),
    }
}

async fn main_get_route(
    deps: web::Data<Arc<Deps>>,
    req: HttpRequest,
    path: web::Path<TxId>,
    query_params: web::Query<FromTo>,
) -> impl Responder {
    let tx_id = path.tx_id.clone();
    let from_sort_key = query_params.from.clone();
    let to_sort_key = query_params.to.clone();
    let limit = query_params.limit.clone();
    let process_id = query_params.process_id.clone();

    match router::redirect_tx_id(deps.get_ref().clone(), tx_id.clone(), process_id.clone()).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::TemporaryRedirect()
                .insert_header((LOCATION, target_url))
                .finish();
        }
        Ok(None) => (),
        Err(err) => return err_response(err.to_string()),
    }

    let result = flows::read_message_data(
        deps.get_ref().clone(),
        tx_id,
        from_sort_key,
        to_sort_key,
        limit,
    )
        .await;

    match result {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => err_response(err.to_string()),
    }
}

async fn read_process_route(
    deps: web::Data<Arc<Deps>>,
    req: HttpRequest,
    path: web::Path<ProcessIdRequired>,
) -> impl Responder {
    let process_id = path.process_id.clone();

    match router::redirect_process_id(deps.get_ref().clone(), Some(process_id.clone())).await {
        Ok(Some(redirect_url)) => {
            let target_url = format!("{}{}", redirect_url, req.uri());
            return HttpResponse::TemporaryRedirect()
                .insert_header((LOCATION, target_url))
                .finish();
        }
        Ok(None) => (),
        Err(err) => return err_response(err.to_string()),
    }

    match flows::read_process(deps.get_ref().clone(), process_id).await {
        Ok(processed_str) => HttpResponse::Ok()
            .content_type("application/json")
            .body(processed_str),
        Err(err) => err_response(err.to_string()),
    }
}

async fn health_check() -> impl Responder {
    HttpResponse::Ok()
}

#[actix_web::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let mode = match args.get(1) {
        Some(m) => Some(m.clone()),
        None => None,
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
            9000
        }
    };

    let workers = match args.get(3) {
        Some(workers_str) => match workers_str.parse::<usize>() {
            Ok(num) => num,
            Err(_) => {
                let err = Error::new(ErrorKind::InvalidInput, "Workers number is not valid");
                return Err(err);
            }
        },
        None => {
            std::thread::available_parallelism().unwrap().get()
        }
    };

    let wrapped = web::Data::new(init_deps(mode).await);

    let run_deps = wrapped.get_ref().clone();

    if run_deps.config.mode() == "router" {
        match router::init_schedulers(run_deps.clone()).await {
            Err(e) => run_deps.logger.log(format!("{}", e)),
            Ok(m) => run_deps.logger.log(format!("{}", m)),
        };
    }

    HttpServer::new(move || {
        App::new()
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header(),
            )
            .wrap(Logger::default())
            .app_data(wrapped.clone())
            .app_data(web::PayloadConfig::new(10485760))
            .route("/", web::get().to(base))
            .route("/", web::post().to(main_post_route))
            .route("/timestamp", web::get().to(timestamp_route))
            .route("/health", web::get().to(health_check))
            .route("/{tx_id}", web::get().to(main_get_route))
            .route("/processes/{process_id}", web::get().to(read_process_route))
    })
        .workers(workers)
        .bind(("0.0.0.0", port))?
        .run()
        .await
}
