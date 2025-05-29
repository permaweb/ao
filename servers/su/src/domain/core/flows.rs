use std::sync::Arc;
use std::time::Instant;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

use dashmap::DashMap;
use dotenv::dotenv;
use serde_json::json;
use simd_json::to_string as simd_to_string;
use tokio::sync::Mutex;

use super::builder::Builder;
use super::bytes::{DataBundle, DataItem};
use super::json::{Message, Process};
use super::scheduler;

use super::dal::{
    Config, CoreMetrics, DataStore, ExtRouter, ExtRouterErrorType, Gateway, Log, RouterDataStore, Signer, Uploader, Wallet
};

pub struct Deps {
    pub data_store: Arc<dyn DataStore>,
    pub router_data_store: Arc<dyn RouterDataStore>,
    pub logger: Arc<dyn Log>,
    pub config: Arc<dyn Config>,
    pub gateway: Arc<dyn Gateway>,
    pub signer: Arc<dyn Signer>,
    pub wallet: Arc<dyn Wallet>,
    pub uploader: Arc<dyn Uploader>,
    pub metrics: Arc<dyn CoreMetrics>,
    pub ext_router: Arc<dyn ExtRouter>,

    /*
        scheduler is part of the core but we initialize
        it as a dependency so it can be initialized once
        when the server starts up. It also needs its own
        dependencies injected.
    */
    pub scheduler: Arc<scheduler::ProcessScheduler>,

    /*
      Used to only recalculate the deep hashes once for a 
      given process
    */
    pub deephash_locks: Arc<DashMap<String, Arc<Mutex<String>>>>,
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

fn id_res(deps: &Arc<Deps>, id: String, start_top_level: Instant) -> Result<String, String> {
    match system_time_u64() {
        Ok(timestamp) => {
            let response_json = json!({
                "timestamp": timestamp,
                "id": id
            });

            let elapsed_top_level = start_top_level.elapsed();
            deps.metrics
                .write_item_observe(elapsed_top_level.as_millis());

            Ok(response_json.to_string())
        }
        Err(e) => Err(format!("{:?}", e)),
    }
}

/*
  Recompute and save all deep hashes on a process
  this is done on demand for a process when writing
  an item if it isnt up to date with the latest
  deep hash version.
*/
async fn maybe_recalc_deephashes(deps: Arc<Deps>, process_id: &String) -> Result<(), String> {
    /*
      We only want to do the recalc once for a given 
      process this lock will make the function behave
      that way
    */
    let locked_pid = deps.deephash_locks
        .entry(process_id.clone())
        .or_insert_with(|| {
            Arc::new(Mutex::new(process_id.clone()))
        })
        .value()
        .clone();

    /*
      This will drop when the function returns
      allowing the other calls to pass through
      but the wont recalc because the deephash
      version will be correct now.
    */
    let _l = locked_pid.lock().await;

    /*
      No deep hashing available on purely postgres instances
    */
    if !deps.config.use_local_store() && !deps.config.use_disk() {
        deps.logger
          .log(format!("Skipping deephash recalc, no deep hash checks available on this SU"));

        return Ok(())
    }

    let start_recalc = Instant::now();

    deps.logger
        .log(format!("Checking deephash version for {}", process_id));

    let mut from = None;
    let limit = Some(deps.config.deephash_recalc_limit());
    let mut total = 0;

    match deps.data_store.get_deephash_version(process_id).await {
        Ok(d) => {
            if d == deps.config.current_deephash_version() {
                deps.logger
                    .log(format!("Deephash version up to date for {}", process_id));
                return Ok(());
            }
        }
        _ => (),
    };

    deps.logger.log(format!(
        "Deephash version out of date, recalculating hashes for {}",
        process_id
    ));

    let process = match deps.data_store.get_process(&process_id).await {
        Ok(p) => p,
        /*
          the process just hasnt been created yet, do nothing
        */
        Err(_) => return Ok(()),
    };

    loop {
        let bundles = deps
            .data_store
            .get_message_bundles(&process, &from, &limit)
            .await?;

        if bundles.0.len() < 1 {
            break;
        }

        total = total + bundles.0.len();

        deps.logger.log(format!(
            "Total bundles retrieved in deephash calc for process {}: {}",
            total, process_id
        ));

        let final_bundle = bundles.0[bundles.0.len() - 1].clone();
        let final_message = Message::from_bytes(final_bundle.1)?;
        from = Some(final_message.timestamp()?.to_string());

        for (_, bundle) in &bundles.0 {
            let msg = Message::from_bytes(bundle.clone())?;
            /*
              msg_deephash produces an error or None for a message
              that shouldn't get deep hashed. So we swallow the error
              or None value here to proceed with the full recompute
              of all the deep hashes
            */
            match msg_deephash(deps.gateway.clone(), &msg, bundle).await {
                Ok(Some(dh)) => {
                    deps.data_store.save_deephash(&process_id, &dh).await?;
                }
                Ok(None) => (),
                Err(_) => (),
            };
        }

        if bundles.1 == false {
            break;
        }
    }

    deps.data_store
        .save_deephash_version(process_id, &deps.config.current_deephash_version())
        .await?;

    deps.logger
        .log(format!("All deep hashes recalculated for {}", process_id));

    let elapsed_recalc = start_recalc.elapsed();

    deps.logger.log(format!(
        "Deephash recalculation time - {} - {}",
        process_id,
        elapsed_recalc.as_millis()
    ));

    Ok(())
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
    deps.logger.log(format!("write item called"));
    let start_top_level = Instant::now();
    let builder = init_builder(&deps)?;

    let (target_id, data_item) = if let (Some(ref process_id), Some(_)) = (&process_id, &assign) {
        (process_id.clone(), None)
    } else {
        let data_item = Builder::parse_data_item(input.clone())?;
        match data_item
            .tags()
            .iter()
            .find(|tag| tag.name == "Type" || tag.name == "type")
        {
            Some(type_tag) => match type_tag.value.as_str() {
                "Process" => (data_item.id(), Some(data_item)),
                "Message" => (data_item.target(), Some(data_item)),
                _ => return Err("Unsupported Type tag value".to_string()),
            },
            None => return Err("Type tag not present".to_string()),
        }
    };

    deps.logger.log(format!(
        "builder initialized item parsed target - {}",
        &target_id
    ));

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

    deps.logger.log(format!(
        "lock acquired - {} - {}",
        &target_id,
        elapsed_acquire_lock.as_millis()
    ));

    /*
      Check to see if the message already exists, this
      doesn't need to run for an assignment. If we start
      dropping the lock after writing the database in the
      future we need to modify this to check some sort of
      set cache that gets set before the lock is released
    */
    if let Some(ref item) = data_item {
        deps.data_store.check_existing_message(&item.id())?;
    };

    deps.logger
        .log(format!("checked for message existence- {}", &target_id));

    /*
      Regenerate deep hashes if they are the old
      version on demand for a given process
    */
    let t_clone = target_id.clone();
    let d_clone = deps.clone();
    let d_clone_log = deps.clone();
    tokio::task::spawn(async move {
      match maybe_recalc_deephashes(d_clone, &t_clone).await {
        Ok(_) => d_clone_log.logger.log("Deep hash recalculation succeeded".to_string()),
        Err(e) => d_clone_log.logger.log(format!("Deep hash recalculation failed: {:?}", e))
      }
    });

    /*
      Increment the scheduling info using the locked mutable reference
      to schedule_info
    */
    let next_schedule_info = deps
        .scheduler
        .increment(&mut *schedule_info, target_id.clone())
        .await?;

    deps.logger
        .log(format!("incrememted scheduler - {}", &target_id));

    /*
       XOR, if we have one of these, we must have both.
       The else if condition here contains the flow for a
       POST of an assignment
    */
    if process_id.is_some() ^ assign.is_some() {
        return Err("If sending assign or process-id, you must send both.".to_string());
    } else if let (Some(process_id), Some(assign)) = (process_id.clone(), assign.clone()) {
        let assignment = builder
            .gen_assignment(
                Some(assign.clone()),
                process_id.clone(),
                &next_schedule_info,
                &exclude,
            )
            .await?;

        let process = deps.data_store.get_process(&process_id).await?;

        let gateway_tx = match builder
            .verify_assignment(&assign, &process, &base_layer)
            .await?
        {
            Some(g) => g,
            None => return Err("Invalid gateway tx for assignming".to_string()),
        };

        /*
          If this is an assignment of an AO Message,
          check for a duplicate deep hash and throw
          an error if we find one
        */
        let deep_hash = match &base_layer {
            Some(_) => None,
            None => {
                let tx_data = deps.gateway.raw(&assign).await?;
                let dh = DataItem::deep_hash_fields(
                    gateway_tx.recipient,
                    gateway_tx.anchor,
                    gateway_tx.tags,
                    tx_data,
                )
                .map_err(|_| "Unable to calculate deep hash".to_string())?;

                if deps.config.enable_deep_hash_checks() {
                    deps.data_store
                        .check_existing_deep_hash(&process_id, &dh)
                        .await?;
                }

                Some(dh)
            }
        };

        let aid = assignment.id();
        let return_aid = assignment.id();
        let build_result = builder.bundle_items(vec![assignment]).await?;
        let message = Message::from_bundle(&build_result.bundle)?;
        deps.data_store
            .save_message(&message, &build_result.binary, deep_hash.as_ref())
            .await?;
        deps.logger.log(format!("saved message"));

        /*
          we set the id of the previous assignment
          for the next message to be able to use
          in its Hash Chain
        */
        deps.scheduler.commit(
            &mut *schedule_info,
            &next_schedule_info,
            process_id.clone(),
            aid,
        );
        drop(schedule_info);

        upload(&deps, build_result.binary.to_vec()).await?;
        return id_res(&deps, return_aid, start_top_level);
    }

    /*
      The rest of this function handles writing a Process
      or a Message data item.
    */

    let data_item = match data_item {
        Some(d) => d,
        None => return Err("Unable to parse data item".to_string()),
    };

    let tags = data_item.tags().clone();
    let type_tag = tags
        .iter()
        .find(|tag| tag.name == "Type" || tag.name == "type");
    let proto_tag_exists = tags
        .iter()
        .any(|tag| tag.name == "Data-Protocol" || tag.name == "data-protocol");
    if !proto_tag_exists {
        return Err("Data-Protocol tag not present".to_string());
    }

    let type_tag = match type_tag {
        Some(t) => t,
        None => return Err("Invalid Type Tag".to_string()),
    };

    if type_tag.value == "Process" {
        let mod_tag_exists = tags.iter().any(|tag| tag.name == "Module");
        let sched_tag_exists = tags.iter().any(|tag| tag.name == "Scheduler");

        if !mod_tag_exists || !sched_tag_exists {
            return Err(
                "Required Module and Scheduler tags for Process type not present".to_string(),
            );
        }

        /*
          If we dont enable_process_assignment, the
          su will follow the old flow and not generate
          an assignment for the process.

          As a result, no process will be returned
          in the messages list either, and the Nonce
          will start at 0 for the first message
        */
        if deps.config.enable_process_assignment() {
            match deps.config.enable_router_check() {
              true => {
                  match deps.ext_router.get_routed_assignment(data_item.id()).await {
                    Ok(a) => {
                        /*
                          This process was spawned on another SU through
                          the router so we should not allow it to be spawned
                          here as well.
                        */
                        if a != deps.config.assignment() {
                            return Err("Process does not belong on this SU".to_string())
                        }
                    },
                    Err(e) => {
                        match e {
                            /*
                              The process doesnt exist on the router so we
                              are safe to proceed.
                            */
                            ExtRouterErrorType::NotFound(_) => (),
                            /*
                              Some other error occured while attempting to
                              check the router for a process id we cant determine
                              if it is safe so throw an error.
                            */
                            _ => return Err("Unable to check router".to_string())
                        }
                    }
                  }
              },
              false => ()
            };

            match data_item.tags().iter().find(|tag| tag.name == "On-Boot") {
                Some(boot_tag) => match boot_tag.value.as_str() {
                    "Data" => (),
                    tx_id => {
                        if !deps.gateway.check_head(tx_id.to_string()).await? {
                            return Err("Invalid tx id for On-Boot tag".to_string());
                        }
                    }
                },
                None => (),
            };

            let assignment = builder
                .gen_assignment(None, data_item.id(), &next_schedule_info, &None)
                .await?;

            let aid = assignment.id();
            let did = data_item.id();
            let build_result = builder.bundle_items(vec![assignment, data_item]).await?;

            let process = Process::from_bundle(&build_result.bundle)?;
            deps.data_store
                .save_process(&process, &build_result.binary)?;

            deps.scheduler
                .commit(&mut *schedule_info, &next_schedule_info, did, aid);
            drop(schedule_info);

            upload(&deps, build_result.binary.to_vec()).await?;

            return id_res(&deps, process.process.process_id.clone(), start_top_level);
        } else {
            let build_result = builder.build_process(input, &next_schedule_info).await?;
            let process = Process::from_bundle_no_assign(
                &build_result.bundle,
                &build_result.bundle_data_item,
            )?;
            deps.data_store
                .save_process(&process, &build_result.binary)?;
            deps.logger.log(format!("saved process"));

            /*
              We dont commit and schedule info change here
              because the process is not getting a Nonce.
              However we dont drop the lock until the Process
              is successfully saved to the database
            */
            drop(schedule_info);

            upload(&deps, build_result.binary.to_vec()).await?;
            return id_res(&deps, process.process.process_id.clone(), start_top_level);
        }
    } else if type_tag.value == "Message" {
        let assignment = builder
            .gen_assignment(
                Some(data_item.id()),
                data_item.target(),
                &next_schedule_info,
                &None,
            )
            .await?;

        let aid = assignment.id();
        let dtarget = data_item.target();

        let deep_hash = match tags.iter().find(|tag| tag.name == "From-Process") {
            /*
              If the Message contains a From-Process tag it is
              a pushed message so we should dedupe it, otherwise
              it is a user message and we should not
            */
            Some(_) => {
                let mut mutable_item = data_item.clone();
                let deep_hash = match mutable_item.deep_hash() {
                    Ok(d) => d,
                    Err(_) => return Err("Unable to calculate deep hash".to_string()),
                };

                /*
                  Throw an error if we detect a duplicated pushed
                  message
                */
                if deps.config.enable_deep_hash_checks() {
                    deps.data_store
                        .check_existing_deep_hash(&dtarget, &deep_hash)
                        .await?;
                }

                Some(deep_hash)
            }
            None => None,
        };

        let build_result = builder.bundle_items(vec![assignment, data_item]).await?;
        let message = Message::from_bundle(&build_result.bundle)?;

        deps.data_store
            .save_message(&message, &build_result.binary, deep_hash.as_ref())
            .await?;

        deps.logger.log(format!("saved message"));

        /*
          we set the id of the previous assignment
          for the next message to be able to use
          in its Hash Chain
        */
        deps.scheduler
            .commit(&mut *schedule_info, &next_schedule_info, dtarget, aid);
        drop(schedule_info);

        upload(&deps, build_result.binary.to_vec()).await?;
        return id_res(&deps, message.message_id()?, start_top_level);
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
    from_nonce: Option<String>,
    to_nonce: Option<String>,
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

    if let Ok(process) = deps.data_store.get_process(&tx_id).await {
        let start = Instant::now();
        let messages = deps
            .data_store
            .get_messages(&process, &from, &to, &limit, &from_nonce, &to_nonce)
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

pub async fn read_latest_message(deps: Arc<Deps>, process_id: String) -> Result<String, String> {
    if let Ok(Some(message)) = deps.data_store.get_latest_message(&process_id).await {
        return serde_json::to_string(&message).map_err(|e| format!("{:?}", e));
    } else {
        if let Ok(process) = deps.data_store.get_process(&process_id).await {
            let message = Message::from_process(process)?;
            return serde_json::to_string(&message).map_err(|e| format!("{:?}", e));
        } else {
            Err("Latest message not available".to_string())
        }
    }
}

pub async fn read_process(deps: Arc<Deps>, process_id: String) -> Result<String, String> {
    let start = Instant::now();
    let process = deps.data_store.get_process(&process_id).await?;
    let elapsed = start.elapsed();
    deps.metrics.get_process_observe(elapsed.as_millis());
    let result = match serde_json::to_string(&process.process) {
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

pub async fn msg_deephash(
    gateway: Arc<dyn Gateway>,
    message: &Message,
    bundle_bytes: &Vec<u8>,
) -> Result<Option<String>, String> {
    match &message.message {
        Some(m) => {
            let bundle_data_item = match DataItem::from_bytes(bundle_bytes.clone()) {
                Ok(b) => b,
                Err(_) => {
                    return Err("Error parsing bundle for message deephash".to_string());
                }
            };
            let data_bytes = match bundle_data_item.data_bytes() {
                Some(b) => b,
                None => {
                    return Err("Error parsing bundle for message deephash".to_string());
                }
            };
            let bundle = match DataBundle::from_bytes(&data_bytes) {
                Ok(b) => b,
                Err(_) => {
                    return Err("Error parsing bundle for message deephash".to_string());
                }
            };

            let mut message_item = bundle.items[1].clone();
            let deep_hash = match m.tags.iter().find(|tag| tag.name == "From-Process") {
                Some(_) => match message_item.deep_hash() {
                    Ok(d) => Some(d),
                    Err(_) => return Err("Unable to calculate deep hash".to_string()),
                },
                None => None,
            };

            Ok(deep_hash)
        }
        None => {
            let message_id = &message.message_id()?;

            /*
              filter out base layer tx's
            */
            match gateway.status(&message_id).await {
                Ok(_) => return Ok(None),
                Err(_) => ()
            };

            let gateway_tx = gateway.gql_tx(&message_id).await?;
            let tx_data = gateway.raw(&message_id).await?;
            
            let dh = DataItem::deep_hash_fields(
                gateway_tx.recipient,
                gateway_tx.anchor,
                gateway_tx.tags,
                tx_data,
            )
            .map_err(|_| "Unable to calculate deep hash".to_string())?;

            Ok(Some(dh))
        }
    }
}
