
use std::sync::Arc;

use dotenv::dotenv;
use std::time::{SystemTime, UNIX_EPOCH, SystemTimeError};
use serde_json::json;
use arweave_rs::network::NetworkInfoClient;
use reqwest::{Url};

use crate::domain::clients::uploader::UploaderClient;
use crate::domain::clients::store::{StoreClient};
use crate::domain::clients::gateway::ArweaveGateway;
use crate::domain::clients::wallet::FileWallet;
use crate::domain::clients::signer::ArweaveSigner;
use crate::domain::core::json::{Message, Process, SortedMessages};
use crate::domain::core::builder::{Builder, BuildResult};
use crate::domain::core::dal::{Gateway, Wallet, Signer, Log};
use crate::config::Config;

pub struct Deps {
    pub data_store: Arc<StoreClient>,
    pub logger: Arc<dyn Log>,
    pub config: Arc<Config>
}

/*
flows.rs ties together core modules and client 
modules to produce the desired end result
*/

async fn build(deps: &Arc<Deps>, input: Vec<u8>) -> Result<BuildResult, String> {
    dotenv().ok();
    let gateway: Arc<dyn Gateway> = Arc::new(ArweaveGateway);
    let wallet: Arc<dyn Wallet> = Arc::new(FileWallet);
    let wallet_path = &deps.config.su_wallet_path;
    let arweave_signer = ArweaveSigner::new(wallet_path)?;
    let signer: Arc<dyn Signer> = Arc::new(arweave_signer);
    let builder = Builder::new(gateway, wallet, signer, &deps.logger)?;
    let build_result = builder.build(input).await?;
    Ok(build_result)
}

async fn upload(deps: &Arc<Deps>, build_result: Vec<u8>) -> Result<String, String> {
    let upload_node_url = &deps.config.upload_node_url;
    let uploader = UploaderClient::new(upload_node_url, &deps.logger)?;
    let uploaded_tx = uploader.upload(build_result).await?;
    let result = match serde_json::to_string(&uploaded_tx) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}

/*
    this writes a message or process data item
    it detects which it is creating by the tags
*/
pub async fn write_item(deps: Arc<Deps>, input: Vec<u8>) -> Result<String, String> {
    let build_result = build(&deps, input).await?;
    let r = upload(&deps, build_result.binary.to_vec()).await?;

    let tags = build_result.bundle.items[0].tags().clone();

    let proto_tag_exists = tags.iter().any(|tag| tag.name == "Data-Protocol");
    let type_tag = tags.iter().find(|tag| tag.name == "Type");

    if !proto_tag_exists {
        return Err("Data-Protocol tag not present".to_string());
    }

    if let Some(type_tag) = type_tag {
        match type_tag.value.as_str() {
            "Message" | "Process" => {
                if type_tag.value == "Process" {
                    let mod_tag_exists = tags.iter().any(|tag| tag.name == "Module");
                    let sched_tag_exists = tags.iter().any(|tag| tag.name == "Scheduler");

                    if !mod_tag_exists || !sched_tag_exists {
                        return Err("Required Module and Scheduler tags for Process type not present".to_string());
                    } else {
                        let process = Process::from_bundle(&build_result.bundle)?;
                        deps.data_store.save_process(&process)?;
                        deps.logger.log(format!("saved process - {:?}", &process));
                    }
                } else {
                    let message = Message::from_bundle(&build_result.bundle)?;
                    deps.data_store.save_message(&message)?;
                    deps.logger.log(format!("saved message - {:?}", &message));
                }
            }
            _ => return Err("Type tag has an invalid value".to_string()),
        }
    } else {
        return Err("Type tag not present".to_string());
    }

    Ok(r)
}


pub async fn read_message_data(
    deps: Arc<Deps>,
    tx_id: String, 
    from: Option<String>, 
    to: Option<String>
) -> Result<String, String> {
    if let Ok(message) = deps.data_store.get_message(&tx_id) {
        let result = match serde_json::to_string(&message) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        return Ok(result);
    }

    if let Ok(_) = deps.data_store.get_process(&tx_id) {
        let messages = deps.data_store.get_messages(&tx_id)?;
        let sorted_messages = SortedMessages::from_messages(messages, from, to)?;
        let result = match serde_json::to_string(&sorted_messages) {
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


/*
The below 3 redirect functions are only relevant 
to a su running in router mode (ao-sched) they will
inspect su requests and return an Option<String>
indicating a redirect where nececessary
*/

// if this returns Ok(Some(String)) then the server should return a redirect to the String
pub async fn redirect_process_id(deps: Arc<Deps>, process_id: Option<String>) -> Result<Option<String>, String> {
    if deps.config.mode != "router" {
        return Ok(None);
    }

    let pid = match process_id {
        Some(p) => p,
        None => return Err("No process-id query parameter provided".to_string()),
    };

    // if this is the AO_PROCESS_ID do not redirect
    if pid == deps.config.ao_process_id {
        return Ok(None);
    }

    // every other process_id redirect
    let process_scheduler = deps.data_store.get_process_scheduler(&pid)?;
    let scheduler = deps.data_store.get_scheduler(&process_scheduler.scheduler_row_id)?;

    Ok(Some(scheduler.url))
}

// if this returns Ok(Some(String)) then the server should return a redirect to the String
pub async fn redirect_tx_id(deps: Arc<Deps>, tx_id: String, process_id: Option<String>) -> Result<Option<String>, String> {
    if deps.config.mode != "router" {
        return Ok(None);
    }

    if tx_id == deps.config.ao_process_id {
        return Ok(None);
    }

    let process_to_query = if let Err(_) = deps.data_store.get_process_scheduler(&tx_id) {
        if let Some(p) = process_id {
            p
        } else {
            return Err("Unable to locate process, if this is a message id query be sure to pass the process-id query parameter".to_string());
        }
    } else {
        tx_id
    };

    match deps.data_store.get_process_scheduler(&process_to_query) {
        Ok(process_scheduler) => {
            let scheduler = deps.data_store.get_scheduler(&process_scheduler.scheduler_row_id)?;
            Ok(Some(scheduler.url.clone()))
        },
        Err(_) => Err("Unable to locate process, if this is a message id query be sure to pass the process-id query parameter".to_string()),
    }
}


// if this returns Ok(Some(String)) then the server should return a redirect to the String
pub async fn redirect_data_item(deps: Arc<Deps>, input: Vec<u8>) -> Result<Option<String>, String> {
    if deps.config.mode != "router" {
        return Ok(None);
    }

    let build_result = build(&deps, input).await?;

    let tags = build_result.bundle.items[0].tags().clone();
    let id = build_result.bundle.items[0].id().clone();
    let target = build_result.bundle.items[0].target().clone();
    let type_tag = tags.iter().find(|tag| tag.name == "Type");

    if let Some(type_tag) = type_tag {
        match type_tag.value.as_str() {
            "Message" | "Process" => {
                // someone is trying to create a process
                if type_tag.value == "Process" {
                    // cannot recreate the ao staking process
                    if id == deps.config.ao_process_id {
                        return Err("Cannot recreate the ao staking process".to_string());
                    }
                    // new process so we need to generate a
                    // process_schedulers record and return the url
                } else {
                    // this else block is when someone is writing a message

                    /*
                        if we are writing a message to the
                        ao staking process we want to sequence
                        on this server so no redirect
                    */
                    if target == deps.config.ao_process_id {
                        return Ok(None);
                    }

                    /*
                        otherwise, fetch the correct scheduler based
                        on the messages's target
                    */
                    
                }
            }
            _ => return Err("Cannot redirect data item, invalid Type Tag".to_string()),
        }
    } else {
        return Err("Cannot redirect data item, invalid Type Tag".to_string());
    }


    Ok(Some("http://localhost:9000".to_string()))
}