use url::Url;
use crate::err::SchedulerErrors;
use reqwest::Client;
use async_trait::async_trait;

pub struct CheckForRedirect;

#[async_trait]
pub trait CheckForRedirectFn {
    async fn check_for_redirect_with (&self, url: &str, process: &str) -> Result<String, SchedulerErrors>;
}

#[async_trait]
impl CheckForRedirectFn for CheckForRedirect {
    async fn check_for_redirect_with (&self, url: &str, process: &str) -> Result<String, SchedulerErrors> {
        let client = Client::builder().redirect(reqwest::redirect::Policy::none()).build().unwrap();
        
        // In an HTTP redirect the Location header is the new url
        match client
            .get(format!("{}?process-id={}", url, process))
            .send()
            .await {
            Ok(res) => {
                if let Some(_found) = [301, 302, 307, 308].iter().find(|no| **no == res.status().as_u16()) {
                    if let Some(location) = res.headers().get("Location") {
                        match location.to_str() {
                            Ok(loc) => {
                                let location_url = Url::parse(loc);
                                let origin = location_url.unwrap().origin();
                                let url_str = origin.unicode_serialization();
                                return Ok(url_str);
                            },
                            Err(_) => return Err(SchedulerErrors::Url)
                        }                
                    }
                }
                Ok(url.to_string())
            }, 
            Err(e) => Err(SchedulerErrors::Network(Some(Box::new(e))))
        }    
    }
}

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use mockito::Server;

//     const REDIRECT_URL: &str = "http://newlocation.com";

//     #[tokio::test] 
//     async fn test_redirect_check_for_redirect_with() {
//         let mut server = Server::new_async().await;
//         let url = server.url();

//         server.mock("GET", "/")
//             .match_query(mockito::Matcher::UrlEncoded("process-id".to_string(), "123".to_string()))
//             .with_status(302)
//             .with_header("Location", REDIRECT_URL)
//             .with_body("hello world")
//             .create();

//         let check_redirect = CheckForRedirect;
//         let result = check_redirect.check_for_redirect_with(url.as_str(), "123").await;
//         assert!(result.unwrap() == REDIRECT_URL.to_string());
//     }

//     #[tokio::test]
//     async fn test_noredirect_check_for_redirect_with() {
//         let mut server = Server::new_async().await;
//         let url = server.url();

//         server.mock("GET", "/")
//             .match_query(mockito::Matcher::UrlEncoded("process-id".to_string(), "123".to_string()))
//             .with_header("Location", REDIRECT_URL)
//             .with_body("hello world")
//             .create();

//         let check_redirect = CheckForRedirect;
//         let result = check_redirect.check_for_redirect_with(url.as_str(), "123").await;
//         assert!(result.unwrap() == url);
//     }
// }