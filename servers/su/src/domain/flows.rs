
use std::sync::Arc;

use dotenv::dotenv;
use std::time::{SystemTime, UNIX_EPOCH, SystemTimeError};
use serde_json::json;
use arweave_rs::network::NetworkInfoClient;
use reqwest::{Url};

use crate::domain::clients::uploader::UploaderClient;
use crate::domain::clients::store::{StoreClient};
use crate::domain::clients::wallet::FileWallet;
use crate::domain::clients::signer::ArweaveSigner;
use crate::domain::core::json::{Message, Process};
use crate::domain::core::builder::{Builder};
use crate::domain::core::dal::{Gateway, Signer, Log, Wallet};
use crate::domain::scheduler;
use crate::config::Config;

pub struct Deps {
    pub data_store: Arc<StoreClient>,
    pub logger: Arc<dyn Log>,
    pub config: Arc<Config>,
    pub scheduler: Arc<scheduler::ProcessScheduler>,
    pub gateway: Arc<dyn Gateway>
}

/*
flows.rs ties together core modules and client 
modules to produce the desired end result
*/


pub fn init_builder(deps: &Arc<Deps>) -> Result<Builder, String> {
    dotenv().ok();
    let wallet_path = &deps.config.su_wallet_path;
    let arweave_signer = ArweaveSigner::new(wallet_path)?;
    let signer: Arc<dyn Signer> = Arc::new(arweave_signer);
    let builder = Builder::new(deps.gateway.clone(), signer, &deps.logger)?;
    return Ok(builder);
}

async fn upload(deps: &Arc<Deps>, build_result: Vec<u8>) -> Result<String, String> {
    let upload_node_url = &deps.config.upload_node_url;
    let uploader = UploaderClient::new(upload_node_url, &deps.logger)?;
    let uploaded_tx = uploader.upload(build_result)?;
    let result = match serde_json::to_string(&uploaded_tx) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}

/*
    this writes a message or process data item,
    it detects which it is creating by the tags
*/
pub async fn write_item(deps: Arc<Deps>, input: Vec<u8>) -> Result<String, String> {
    let builder = init_builder(&deps)?;

    let data_item = builder.parse_data_item(input.clone())?;

    let tags = data_item.tags().clone();
    let type_tag = tags.iter().find(|tag| tag.name == "Type");
    let proto_tag_exists = tags.iter().any(|tag| tag.name == "Data-Protocol");
    if !proto_tag_exists {
        return Err("Data-Protocol tag not present".to_string());
    }

    if let Some(type_tag) = type_tag {
        if type_tag.value == "Process" {
            let mod_tag_exists = tags.iter().any(|tag| tag.name == "Module");
            let sched_tag_exists = tags.iter().any(|tag| tag.name == "Scheduler");

            if !mod_tag_exists || !sched_tag_exists {
                return Err("Required Module and Scheduler tags for Process type not present".to_string());
            }

            /*
                acquire the mutex locked scheduling info for the
                process we are creating. So if a message is written
                while the process is still being created it will wait
            */
            let locked_schedule_info = deps.scheduler.acquire_lock(data_item.id()).await?;
            let schedule_info = locked_schedule_info.lock().await;

            let build_result = builder.build_process(input, &*schedule_info).await?;
            upload(&deps, build_result.binary.to_vec()).await?;
            let process = Process::from_bundle(&build_result.bundle)?;
            deps.data_store.save_process(&process, &build_result.binary)?;
            deps.logger.log(format!("saved process - {:?}", &process));
            match system_time_u64() {
                Ok(timestamp) => {
                    let response_json = json!({ "timestamp": timestamp, "id": process.process_id.clone() });
                    Ok(response_json.to_string())
                }
                Err(e) => Err(format!("{:?}", e))
            }
        } else if type_tag.value == "Message" {
            /*
                acquire the mutex locked scheduling info for the
                process we are writing a message to. this ensures 
                no conflicts in the schedule
            */
            let locked_schedule_info = deps.scheduler.acquire_lock(data_item.target()).await?;
            let schedule_info = locked_schedule_info.lock().await;

            let build_result = builder.build(input, &*schedule_info).await?;
            upload(&deps, build_result.binary.to_vec()).await?;
            let message = Message::from_bundle(&build_result.bundle)?;
            deps.data_store.save_message(&message, &build_result.binary)?;
            deps.logger.log(format!("saved message - {:?}", &message));
            match system_time_u64() {
                Ok(timestamp) => {
                    let response_json = json!({ "timestamp": timestamp, "id": message.message.id.clone() });
                    Ok(response_json.to_string())
                }
                Err(e) => Err(format!("{:?}", e))
            }
        } else {
            return Err("Type tag not present".to_string());
        }
    } else {
        return Err("Type tag not present".to_string());
    }
}


pub async fn read_message_data(
    deps: Arc<Deps>,
    tx_id: String, 
    from: Option<String>, 
    to: Option<String>,
    limit: Option<i32>
) -> Result<String, String> {
    if let Ok(message) = deps.data_store.get_message(&tx_id) {
        let result = match serde_json::to_string(&message) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        return Ok(result);
    }

    if let Ok(_) = deps.data_store.get_process(&tx_id) {
        let messages = deps.data_store.get_messages(&tx_id, &from, &to, &limit)?;
        let result = match serde_json::to_string(&messages) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        return Ok(result);
    }

    Err("Message or Process not found".to_string())
}

pub async fn read_process(
    deps: Arc<Deps>,
    process_id: String
) -> Result<String, String> {
    let process = deps.data_store.get_process(&process_id)?;
    let result = match serde_json::to_string(&process) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}


fn system_time() -> Result<String, SystemTimeError> {
    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    let millis_string = millis.to_string();
    Ok(millis_string)
}

fn system_time_u64() -> Result<u64, SystemTimeError> {
    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    Ok(millis)
}

pub async fn timestamp(deps: Arc<Deps>) -> Result<String, String>{
    match system_time() {
        Ok(timestamp) => {
            let gateway_url = &deps.config.gateway_url;
            let url = match Url::parse(gateway_url) {
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

pub async fn health(_deps: Arc<Deps>) -> Result<String, String>{
    match system_time() {
        Ok(timestamp) => {
            let wallet: Arc<dyn Wallet> = Arc::new(FileWallet);
            let wallet_address = match wallet.wallet_address() {
                Ok(w) => w,
                Err(e) => return Err(e)
            };
            let response_json = json!({ "timestamp": timestamp, "address": wallet_address });
            Ok(response_json.to_string())
            
        }
        Err(e) => Err(format!("{:?}", e))
    }
}