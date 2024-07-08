use std::sync::Arc;
use std::time::Instant;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

use dotenv::dotenv;
use serde_json::json;
use simd_json::to_string as simd_to_string;

use super::builder::Builder;
use super::json::{Message, Process};
use super::scheduler;

use super::dal::{Config, DataStore, Gateway, Log, Signer, Uploader, Wallet};

pub struct Deps {
    pub data_store: Arc<dyn DataStore>,
    pub logger: Arc<dyn Log>,
    pub config: Arc<dyn Config>,
    pub gateway: Arc<dyn Gateway>,
    pub signer: Arc<dyn Signer>,
    pub wallet: Arc<dyn Wallet>,
    pub uploader: Arc<dyn Uploader>,

    /*
        scheduler is part of the core but we initialize
        it as a dependency so it can be initialized once
        when the server starts up. It also needs its own
        dependencies injected.
    */
    pub scheduler: Arc<scheduler::ProcessScheduler>,
}

/*
    flows.rs is the main business logic of the su
*/

pub fn init_builder(deps: &Arc<Deps>) -> Result<Builder, String> {
    dotenv().ok();
    let builder = Builder::new(deps.gateway.clone(), deps.signer.clone(), &deps.logger)?;
    return Ok(builder);
}

async fn upload(deps: &Arc<Deps>, build_result: Vec<u8>) -> Result<String, String> {
    let uploaded_tx = &deps.uploader.upload(build_result)?;
    let result = match serde_json::to_string(&uploaded_tx) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e)),
    };
    Ok(result)
}

async fn assignment_only(
    deps: Arc<Deps>,
    process_id: String,
    assign: String,
    base_layer: Option<String>,
    exclude: Option<String>,
) -> Result<String, String> {
    let builder = init_builder(&deps)?;

    let locked_schedule_info = deps.scheduler.acquire_lock(process_id.clone()).await?;
    let mut schedule_info = locked_schedule_info.lock().await;
    let updated_info = deps
        .scheduler
        .update_schedule_info(&mut *schedule_info, process_id.clone())
        .await?;

    let process = deps.data_store.get_process(&process_id)?;
    let build_result = builder
        .build_assignment(
            assign.clone(),
            &process,
            &*updated_info,
            &base_layer,
            &exclude,
        )
        .await?;

    let message = Message::from_bundle(&build_result.bundle)?;
    deps.data_store
        .save_message(&message, &build_result.binary)
        .await?;
    deps.logger.log(format!("saved message - {:?}", &message));
    upload(&deps, build_result.binary.to_vec()).await?;
    drop(schedule_info);

    match system_time_u64() {
        Ok(timestamp) => {
            let response_json =
                json!({ "timestamp": timestamp, "id": message.assignment.id.clone() });
            Ok(response_json.to_string())
        }
        Err(e) => Err(format!("{:?}", e)),
    }
}

/*
    This writes a message or process data item,
    it detects which it is creating by the tags.
    If the process_id and assign params are set, it
    follows the Assignment flow instead. If one is
    set both must be set.
*/
pub async fn write_item(
    deps: Arc<Deps>,
    input: Vec<u8>,
    process_id: Option<String>,
    assign: Option<String>,
    base_layer: Option<String>,
    exclude: Option<String>,
) -> Result<String, String> {
    // XOR, if we have one of these, we must have both.
    if process_id.is_some() ^ assign.is_some() {
        return Err("If sending assign or process-id, you must send both.".to_string());
    } else if let (Some(process_id), Some(assign)) = (process_id, assign) {
        return assignment_only(deps, process_id, assign, base_layer, exclude).await;
    }

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
                return Err(
                    "Required Module and Scheduler tags for Process type not present".to_string(),
                );
            }

            /*
                acquire the mutex locked scheduling info for the
                process we are creating. So if a message is written
                while the process is still being created it will wait
            */
            let locked_schedule_info = deps.scheduler.acquire_lock(data_item.id()).await?;
            let mut schedule_info = locked_schedule_info.lock().await;
            let updated_info = deps
                .scheduler
                .update_schedule_info(&mut *schedule_info, data_item.id())
                .await?;

            let build_result = builder.build_process(input, &*updated_info).await?;
            upload(&deps, build_result.binary.to_vec()).await?;
            let process = Process::from_bundle(&build_result.bundle)?;
            deps.data_store
                .save_process(&process, &build_result.binary)?;
            deps.logger.log(format!("saved process"));
            drop(schedule_info);
            match system_time_u64() {
                Ok(timestamp) => {
                    let response_json =
                        json!({ "timestamp": timestamp, "id": process.process_id.clone() });
                    Ok(response_json.to_string())
                }
                Err(e) => Err(format!("{:?}", e)),
            }
        } else if type_tag.value == "Message" {
            /*
                acquire the mutex locked scheduling info for the
                process we are writing a message to. this ensures
                no conflicts in the schedule
            */
            let start_total = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            let locked_schedule_info = deps.scheduler.acquire_lock(data_item.target()).await?;
            let mut schedule_info = locked_schedule_info.lock().await;
            let end_acquire_lock = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            deps.logger.log(format!("=== ACQUIRE LOCK - {:?}", (end_acquire_lock - start_total)));

            let updated_info = deps
                .scheduler
                .update_schedule_info(&mut *schedule_info, data_item.target())
                .await?;
            let end_update_schedule_info = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            deps.logger.log(format!("=== UPDATE SCHEDULE INFO - {:?}", (end_update_schedule_info - end_acquire_lock)));

            let build_result = builder.build_message(input, &*updated_info).await?;
            let message = Message::from_bundle(&build_result.bundle)?;
            let end_create_msg = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            deps.logger.log(format!("=== CREATING MESSAGE - {:?}", (end_create_msg - end_update_schedule_info)));

            deps.data_store
                .save_message(&message, &build_result.binary)
                .await?;
            deps.logger.log(format!("saved message"));
            let end_save_msg = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            deps.logger.log(format!("=== SAVING MESSAGE - {:?}", (end_save_msg - end_create_msg)));


            upload(&deps, build_result.binary.to_vec()).await?;
            let end_upload_turbo = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            deps.logger.log(format!("=== UPLOAD TURBO - {:?}", (end_upload_turbo - end_save_msg)));


            drop(schedule_info);
            match system_time_u64() {
                Ok(timestamp) => {
                    let response_json =
                        json!({ "timestamp": timestamp, "id": message.message_id()?, "message": message });
                    let end_total = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
                    deps.logger.log(format!("=== TOTAL MSG - {:?}", (end_total - start_total)));
                    Ok(response_json.to_string())
                }
                Err(e) => Err(format!("{:?}", e)),
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
    limit: Option<i32>,
) -> Result<String, String> {
    if let Ok(message) = deps.data_store.get_message(&tx_id) {
        if message.message.is_some()
            || ((message.message_id()? != message.process_id()?)
                && (message.assignment_id()? == tx_id))
        {
            return serde_json::to_string(&message).map_err(|e| format!("{:?}", e));
        }
    }

    if let Ok(_) = deps.data_store.get_process(&tx_id) {
        let start = Instant::now();
        let messages = deps
            .data_store
            .get_messages(&tx_id, &from, &to, &limit)
            .await?;
        let duration = start.elapsed();
        deps.logger
            .log(format!("Time elapsed in get_messages() is: {:?}", duration));

        let startj = Instant::now();
        let result = simd_to_string(&messages).map_err(|e| format!("{:?}", e))?;
        let durationj = startj.elapsed();
        deps.logger
            .log(format!("Time elapsed in json mapping is: {:?}", durationj));

        return Ok(result);
    }

    Err("Message or Process not found".to_string())
}

pub async fn read_process(deps: Arc<Deps>, process_id: String) -> Result<String, String> {
    let process = deps.data_store.get_process(&process_id)?;
    let result = match serde_json::to_string(&process) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e)),
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

pub async fn timestamp(deps: Arc<Deps>) -> Result<String, String> {
    match system_time() {
        Ok(timestamp) => {
            let network_info = deps.gateway.network_info().await;
            match network_info {
                Ok(info) => {
                    let height = info.height.clone();
                    let height_string = format!("{:0>12}", height);
                    let response_json =
                        json!({ "timestamp": timestamp, "block_height": height_string });
                    Ok(response_json.to_string())
                }
                Err(e) => Err(format!("{:?}", e)),
            }
        }
        Err(e) => Err(format!("{:?}", e)),
    }
}

pub async fn health(deps: Arc<Deps>) -> Result<String, String> {
    match system_time() {
        Ok(timestamp) => {
            let wallet_address = match deps.wallet.wallet_address() {
                Ok(w) => w,
                Err(e) => return Err(e),
            };
            let response_json = json!({ "timestamp": timestamp, "address": wallet_address });
            Ok(response_json.to_string())
        }
        Err(e) => Err(format!("{:?}", e)),
    }
}
