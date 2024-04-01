use std::env;
use actix_cors::Cors;
use actix_web::{ HttpServer, App, http::header, middleware::Logger, web };
use log::info;
use dotenv::dotenv;

pub async fn server() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("debug"));

    dotenv().ok();

    let host = env::var("HOST").unwrap();
    let port = env::var("PORT").unwrap().parse::<u16>().unwrap();

    _ = HttpServer::new(move || {
        App::new()
            // .app_data(app_data.clone()) // if I need global shared state
            .wrap(Logger::default())
            .wrap(
                Cors::default()
                    // .allowed_origin() // todo: add allowed origins with this call
                    .allowed_methods(vec!["GET", "POST"])
                    .allowed_headers(vec![
                        header::CONTENT_TYPE,
                        header::AUTHORIZATION
                    ])
            )
            .service(
                web::scope("/v1") // todo: needs update
                    // .configure(config) // todo: add config
            )
    })
    .bind((host, port))?
    .run()
    .await;

    info!("Stats usage " );

    Ok(())
}