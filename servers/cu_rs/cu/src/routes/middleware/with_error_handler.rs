use std::future::{ready, Ready};
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error
};
use futures_util::future::LocalBoxFuture;
use serde::{Deserialize, Serialize};
use derive_more::{Display, Error};

pub struct ErrorHandler;

impl<S, B> Transform<S, ServiceRequest> for ErrorHandler
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = ErrorHandlerMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ErrorHandlerMiddleware { service }))
    }
}

pub struct ErrorHandlerMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for ErrorHandlerMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {      
        let fut = self.service.call(req);

        Box::pin(async move {
            let res = fut.await?;
            if let Some(_err) = res.response().error() {                
                Err(ErrorMessage {
                    error: "Internal Server Error".to_string() // todo: gather the message info from errors that occur
                }.into()) // todo: need to verify that this into conversion does not loose the error message
            } else {                
                Ok(res)                
            }
        })
    }
}

#[derive(Serialize, Deserialize, Debug, Display, Error)]
struct ErrorMessage {
    error: String
}

impl actix_web::error::ResponseError for ErrorMessage {}
