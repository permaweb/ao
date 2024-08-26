use std::sync::Arc;
use std::time::Instant;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

use dotenv::dotenv;
use serde_json::json;
use simd_json::to_string as simd_to_string;

use super::builder::Builder;
use super::json::{Message, Process};
use super::scheduler;

use super::dal::{Config, CoreMetrics, DataStore, Gateway, Log, Signer, Uploader, Wallet};

pub struct Deps {
    pub data_store: Arc<dyn DataStore>,
    pub logger: Arc<dyn Log>,
    pub config: Arc<dyn Config>,
    pub gateway: Arc<dyn Gateway>,
    pub signer: Arc<dyn Signer>,
    pub wallet: Arc<dyn Wallet>,
    pub uploader: Arc<dyn Uploader>,
    pub metrics: Arc<dyn CoreMetrics>,

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
    let start_top_level = Instant::now();
    let builder = init_builder(&deps)?;

    let (target_id, data_item) = if let (Some(ref process_id), Some(_)) = (&process_id, &assign) {
        (process_id.clone(), None)
    } else {
        let data_item = builder.parse_data_item(input.clone())?;
        match data_item.tags().iter().find(|tag| tag.name == "Type") {
            Some(type_tag) => match type_tag.value.as_str() {
                "Process" => (data_item.id(), Some(data_item)),
                "Message" => (data_item.target(), Some(data_item)),
                _ => return Err("Unsupported Type tag value".to_string()),
            },
            None => return Err("Type tag not present".to_string()),
        }
    };

    /*
      Acquire the lock for a given process id. After acquiring the lock
      we can safely increment it and start building/writing data

      The locked will be dropped after data is parsed and signed so
      that we know the item wont fail and then we will have a missing
      Nonce
    */
    let start_acquire_lock = Instant::now();
    let locked_schedule_info = deps.scheduler.acquire_lock(target_id.clone()).await?;
    let mut schedule_info = locked_schedule_info.lock().await;

    let elapsed_acquire_lock = start_acquire_lock.elapsed();
    deps.metrics
        .acquire_write_lock_observe(elapsed_acquire_lock.as_millis());

    /*
      Increment the scheduling info using the locked mutable reference
      to schedule_info
    */
    let next_schedule_info = deps
        .scheduler
        .increment(&mut *schedule_info, target_id.clone())
        .await?;

    // XOR, if we have one of these, we must have both.
    if process_id.is_some() ^ assign.is_some() {
        return Err("If sending assign or process-id, you must send both.".to_string());
    } else if let (Some(process_id), Some(assign)) = (process_id.clone(), assign.clone()) {
        let assignment = builder
            .gen_assignment(
                assign.clone(),
                process_id.clone(),
                &next_schedule_info,
                &exclude,
            )
            .await?;

        let process = deps.data_store.get_process(&process_id)?;
        builder
            .verify_assignment(&assign, &process, &base_layer)
            .await?;

        /*
          we set the id of the previous assignment
          for the next message to be able to use
          in its Hash Chain
        */
        deps.scheduler.commit(
            &mut *schedule_info,
            &next_schedule_info,
            process_id.clone(),
            assignment.id(),
        )?;
        drop(schedule_info);

        let build_result = builder.bundle_items(vec![assignment]).await?;

        let message = Message::from_bundle(&build_result.bundle)?;
        deps.data_store
            .save_message(&message, &build_result.binary)
            .await?;
        deps.logger.log(format!("saved message - {:?}", &message));
        upload(&deps, build_result.binary.to_vec()).await?;

        match system_time_u64() {
            Ok(timestamp) => {
                let response_json =
                    json!({ "timestamp": timestamp, "id": message.assignment.id.clone() });
                return Ok(response_json.to_string());
            }
            Err(e) => return Err(format!("{:?}", e)),
        }
    }

    let data_item = match data_item {
        Some(d) => d,
        None => return Err("Unable to parse data item".to_string()),
    };

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

            let build_result = builder.build_process(input, &next_schedule_info).await?;
            /*
              We dont commit and schedule info change here
              because the process is not yet getting a Nonce.
            */
            drop(schedule_info);
            upload(&deps, build_result.binary.to_vec()).await?;
            let process = Process::from_bundle(&build_result.bundle)?;
            deps.data_store
                .save_process(&process, &build_result.binary)?;
            deps.logger.log(format!("saved process - {:?}", &process));
            match system_time_u64() {
                Ok(timestamp) => {
                    let response_json =
                        json!({ "timestamp": timestamp, "id": process.process_id.clone() });
                    let elapsed_top_level = start_top_level.elapsed();
                    deps.metrics
                        .write_item_observe(elapsed_top_level.as_millis());
                    Ok(response_json.to_string())
                }
                Err(e) => Err(format!("{:?}", e)),
            }
        } else if type_tag.value == "Message" {
            let assignment = builder
                .gen_assignment(
                    data_item.id(),
                    data_item.target(),
                    &next_schedule_info,
                    &None,
                )
                .await?;

            /*
              we set the id of the previous assignment
              for the next message to be able to use
              in its Hash Chain
            */
            deps.scheduler.commit(
                &mut *schedule_info,
                &next_schedule_info,
                data_item.target(),
                assignment.id(),
            )?;
            drop(schedule_info);

            let build_result = builder.bundle_items(vec![assignment, data_item]).await?;
            let message = Message::from_bundle(&build_result.bundle)?;
            deps.data_store
                .save_message(&message, &build_result.binary)
                .await?;
            deps.logger.log(format!("saved message - {:?}", &message));
            upload(&deps, build_result.binary.to_vec()).await?;
            match system_time_u64() {
                Ok(timestamp) => {
                    let response_json =
                        json!({ "timestamp": timestamp, "id": message.message_id()? });
                    let elapsed_top_level = start_top_level.elapsed();
                    deps.metrics
                        .write_item_observe(elapsed_top_level.as_millis());
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
    let start_top_level = Instant::now();
    let start_get_message = Instant::now();
    if let Ok(message) = deps.data_store.get_message(&tx_id) {
        if message.message.is_some()
            || ((message.message_id()? != message.process_id()?)
                && (message.assignment_id()? == tx_id))
        {
            let elapsed_get_message = start_get_message.elapsed();
            deps.metrics
                .get_message_observe(elapsed_get_message.as_millis());
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
        deps.metrics.get_messages_observe(duration.as_millis());

        let result = simd_to_string(&messages).map_err(|e| format!("{:?}", e))?;

        let elapsed_top_level = start_top_level.elapsed();
        deps.metrics
            .read_message_data_observe(elapsed_top_level.as_millis());

        return Ok(result);
    }

    Err("Message or Process not found".to_string())
}

pub async fn read_process(deps: Arc<Deps>, process_id: String) -> Result<String, String> {
    let start = Instant::now();
    let process = deps.data_store.get_process(&process_id)?;
    let elapsed = start.elapsed();
    deps.metrics.get_process_observe(elapsed.as_millis());
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
