use crate::domain::core::dal::StoreErrorType;
use crate::domain::flows::{init_builder, Deps};
use serde::Deserialize;
use std::{fmt::Debug, sync::Arc};
use tokio::{fs::File, io::AsyncReadExt};

/*
    The code in this file only runs on a su that is
    running in router mode (ao-sched) it will
    inspect su requests and return an Option<String>
    indicating a redirect where nececessary and
    also will initialize the list of schedulers from
    a file. It is a basic load balancer implementation
*/

pub struct Scheduler {
    pub row_id: Option<i32>,
    pub url: String,
    pub process_count: i32,
}

pub struct ProcessScheduler {
    pub row_id: Option<i32>,
    pub process_id: String,
    pub scheduler_row_id: i32,
}

#[derive(Deserialize, Debug)]
struct SchedulerEntry {
    url: String,
}

/*
    this runs at server startup in router mode to
    initialize the schedulers if they dont exist
*/
pub async fn init_schedulers(deps: Arc<Deps>) -> Result<String, String> {
    let mut file = File::open(&deps.config.scheduler_list_path())
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let urls: Vec<SchedulerEntry> =
        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    /*
        Iterate over the URLs and check each one
        if the scheduler doesnt exist yet create it
    */
    for entry in urls {
        if let Err(StoreErrorType::NotFound(_)) = deps.data_store.get_scheduler_by_url(&entry.url) {
            let scheduler = Scheduler {
                row_id: None,
                url: entry.url.clone(),
                process_count: 0,
            };
            deps.data_store.save_scheduler(&scheduler)?;
            deps.logger
                .log(format!("saved new scheduler: {}", entry.url));
        }
    }

    Ok("schedulers initialized".to_string())
}

// if this returns Ok(Some(String)) then the server should return a redirect to the String
pub async fn redirect_process_id(
    deps: Arc<Deps>,
    process_id: Option<String>,
) -> Result<Option<String>, String> {
    if deps.config.mode() != "router" {
        return Ok(None);
    }

    let pid = process_id.ok_or("No process-id query parameter provided")?;

    // every other process_id, redirect
    let process_scheduler = deps.data_store.get_process_scheduler(&pid)?;
    let scheduler = deps
        .data_store
        .get_scheduler(&process_scheduler.scheduler_row_id)?;
    Ok(Some(scheduler.url))
}

// if this returns Ok(Some(String)) then the server should return a redirect to the String
pub async fn redirect_tx_id(
    deps: Arc<Deps>,
    tx_id: String,
    process_id: Option<String>,
) -> Result<Option<String>, String> {
    if deps.config.mode() != "router" {
        return Ok(None);
    }

    let process_to_query = match deps.data_store.get_process_scheduler(&tx_id) {
        Ok(_) => tx_id,
        /*
            we didn't find a process scheduler based on the tx_id
            so we need to try and find one based on process_id query param
        */
        Err(_) => process_id.ok_or("Unable to locate process, if this is a message id query be sure to pass the process-id query parameter")?,
    };

    let process_scheduler = deps.data_store.get_process_scheduler(&process_to_query)?;
    let scheduler = deps
        .data_store
        .get_scheduler(&process_scheduler.scheduler_row_id)?;
    Ok(Some(scheduler.url))
}

// if this returns Ok(Some(String)) then the server should return a redirect to the String
pub async fn redirect_data_item(
    deps: Arc<Deps>,
    input: Vec<u8>,
    process_id: Option<String>,
    assign: Option<String>,
) -> Result<Option<String>, String> {
    if deps.config.mode() != "router" {
        return Ok(None);
    }

    // XOR, if we have one of these, we must have both.
    if process_id.is_some() ^ assign.is_some() {
        return Err("If sending assign or process-id, you must send both.".to_string());
    } else if let (Some(process_id), Some(_assign)) = (process_id, assign) {
        match deps.data_store.get_process_scheduler(&process_id) {
            Ok(process_scheduler) => {
                let scheduler = deps
                    .data_store
                    .get_scheduler(&process_scheduler.scheduler_row_id)?;
                return Ok(Some(scheduler.url));
            }
            Err(_) => return Err("Unable to locate scheduler for process-id".to_string()),
        }
    }

    let builder = init_builder(&deps)?;
    let item = builder.parse_data_item(input.clone())?;
    let tags = item.tags().clone();
    let id = item.id().clone();
    let target = item.target().clone();
    let type_tag = tags
        .iter()
        .find(|tag| tag.name == "Type")
        .ok_or("Cannot redirect data item, invalid Type Tag")?;

    match type_tag.value.as_str() {
        "Process" => {
            /*
                new process so we need to generate a
                process_schedulers record and return the url
            */
            let mut schedulers = deps.data_store.get_all_schedulers()?;
            if let Some(min_scheduler) = schedulers.iter_mut().min_by_key(|s| s.process_count) {
                min_scheduler.process_count += 1;
                deps.data_store.update_scheduler(min_scheduler)?;

                let scheduler_row_id = if let Some(min_scheduler_row_id) = min_scheduler.row_id {
                    min_scheduler_row_id
                } else {
                    /*
                        this should be unreachable but return an error
                        just in case so the router doesn't crash
                    */
                    return Err("Missing id on scheduler".to_string());
                };

                let process_scheduler = ProcessScheduler {
                    row_id: None,
                    scheduler_row_id: scheduler_row_id,
                    process_id: id,
                };
                deps.data_store.save_process_scheduler(&process_scheduler)?;

                Ok(Some(min_scheduler.url.clone()))
            } else {
                Err("Could not find a scheduler to assign".to_string())
            }
        }
        "Message" => {
            /*
                otherwise, fetch the correct scheduler based
                on the messages's target
            */
            match deps.data_store.get_process_scheduler(&target) {
                Ok(process_scheduler) => {
                    let scheduler = deps
                        .data_store
                        .get_scheduler(&process_scheduler.scheduler_row_id)?;
                    Ok(Some(scheduler.url))
                }
                Err(_) => Err("Unable to locate scheduler for message target".to_string()),
            }
        }
        _ => Err("Cannot redirect data item, invalid Type Tag".to_string()),
    }
}
