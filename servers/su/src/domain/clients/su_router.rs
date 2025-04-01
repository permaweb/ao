use crate::domain::config::AoConfig;
use reqwest::{Client, Url};
use async_trait::async_trait;

use crate::domain::core::dal::{ ExtRouter, ExtRouterErrorType };

pub struct SuRouter;

#[async_trait]
impl ExtRouter for SuRouter {
    async fn get_routed_assignment(
        &self, 
        process_id: String
    ) -> Result<String, ExtRouterErrorType> {
        let config = AoConfig::new(
            Some("su".to_string())
        ).expect("Failed to read configuration");

        let router_url = config.router_url;
        let client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| ExtRouterErrorType::ConfigError(e.to_string()))?;

        let url = match Url::parse(&router_url) {
            Ok(u) => u,
            Err(_) => return Err(
              ExtRouterErrorType::ConfigError(
                "Invalid router url configured".to_string()
              )
            )
        };

        let response = client
            .get(
              url.join(&format!("/{}?process-id={}", process_id, process_id))
                    .map_err(|e| ExtRouterErrorType::ConfigError(e.to_string()))?,
            )
            .send()
            .await;

        match response {
            Ok(res) => {
                if res.status().is_redirection() {
                    if let Some(location) = res.headers().get("Location") {
                        let location_str = location.to_str().map_err(|e| {
                            ExtRouterErrorType::NetworkError(
                                format!("Invalid Location header: {}", e)
                            )
                        })?;
                
                        if let Some(subdomain_part) = location_str.strip_prefix("https://su") {
                            if let Some(rest) = subdomain_part.split('.').next() {
                                if let Ok(num) = rest.parse::<u32>() {
                                    return Ok(num.to_string());
                                }
                            }
                        }
                    } 
                }
            },
            Err(_) => return Err(
                ExtRouterErrorType::NetworkError(
                    "Network error checking the router".to_string()
                )
            )
        }

        Err(ExtRouterErrorType::NotFound("Process not found on the router".to_string()))
    }
}
