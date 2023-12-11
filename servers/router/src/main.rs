
use std::sync::Arc;

use actix_web::{web, App, HttpResponse, HttpServer, HttpRequest, http::header::LOCATION};

use router::su_router::{StoreClient, Deps};

/*
This server is just a router that returns 302 redirects 
to the actual su nodes, it finds the correct su node for
a given process id
*/

// 308 redirect for all routes that exist on a su
async fn redirect(deps: web::Data<Arc<Deps>>, req: HttpRequest) -> HttpResponse {
    let target_url = format!("http://localhost:9000{}", req.uri().to_string());
    HttpResponse::PermanentRedirect().insert_header((LOCATION, target_url)).finish()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let data_store = Arc::new(StoreClient::new().expect("Failed to create StoreClient"));
    let deps: Deps = Deps {
        data_store
    };
    let wrapped = web::Data::new(Arc::new(deps));

    HttpServer::new(move || {
        App::new()
            .app_data(wrapped.clone())
            .route("/", web::get().to(redirect))
            .route("/timestamp", web::get().to(redirect))
            .route("/message", web::post().to(redirect))
            .route("/messages/{process_id}", web::get().to(redirect))
            .route("/message/{message_id}", web::get().to(redirect))
            .route("/process", web::post().to(redirect))
            .route("/processes/{process_id}", web::get().to(redirect))
    })
    .bind(("0.0.0.0", 8000))?
    .run()
    .await
}
