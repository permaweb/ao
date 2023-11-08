
use std::time::{SystemTime, UNIX_EPOCH, SystemTimeError};

use serde_json::json;

use arweave_rs::network::NetworkInfoClient;

use reqwest::{Url};

pub struct TimestampPipeline
{
    
}

fn system_time() -> Result<String, SystemTimeError> {
    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    let millis_string = millis.to_string();
    Ok(millis_string)
}

impl TimestampPipeline {
    pub fn new() -> Result<Self, String> {
        Ok(TimestampPipeline {
            
        })
    }

    pub async fn process(
        &mut self
    ) -> Result<String, String> {
        self.read_data()
            .await
    }

    pub async fn read_data(
        &mut self
    ) -> Result<String, String> {
        match system_time() {
            Ok(timestamp) => {
                let gateway_url = "https://arweave.net".to_string();
                let url = match Url::parse(&gateway_url) {
                    Ok(u) => u,
                    Err(e) => return Err(format!("url error {:?}", e))
                };
    
                let network_client = NetworkInfoClient::new(url);
                let network_info = network_client.network_info().await;
                match network_info {
                    Ok(info) => {
                        let height = info.height.clone();
                        let height_string = format!("{:0>12}", height);
                        let response_json = json!({ "timestamp": timestamp, "block_height": height_string });
                        Ok(response_json.to_string())
                    },
                    Err(e) => {
                        Err(format!("{:?}", e))
                    }
                }
                
            }
            Err(e) => Err(format!("{:?}", e))
        }
    }
}
