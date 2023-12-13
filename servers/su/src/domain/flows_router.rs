use std::sync::Arc;

use serde::Deserialize;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

use crate::domain::clients::store::{StoreErrorType};
use crate::domain::flows::{Deps, build};


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
    pub process_count: i32
}

pub struct ProcessScheduler {
    pub row_id: Option<i32>,
    pub process_id: String,
    pub scheduler_row_id: i32
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
    let mut file = match File::open(&deps.config.scheduler_list_path).await {
        Ok(file) => file,
        Err(e) => return Err(format!("Failed to open file: {}", e)),
    };

    let mut contents = String::new();
    if let Err(e) = file.read_to_string(&mut contents).await {
        return Err(format!("Failed to read file: {}", e));
    }

    let urls: Vec<SchedulerEntry> = match serde_json::from_str(&contents) {
        Ok(urls) => urls,
        Err(e) => return Err(format!("Failed to parse JSON: {}", e)),
    };

    /*
        Iterate over the URLs and check each one
        if the scheduler doesnt exist yet create it
    */
    for entry in urls {
        let result = deps.data_store.get_scheduler_by_url(&entry.url);

        match result {
            Err(StoreErrorType::NotFound(_)) => {
                let scheduler = Scheduler {
                    row_id: None,
                    url: entry.url.clone(),
                    process_count: 0
                };
                deps.data_store.save_scheduler(&scheduler)?;
                deps.logger.log(format!("saved new scheduler: {}", entry.url));
            },
            Err(e) => {
                return Err(format!("Error retrieving scheduler: {:?}", e));
            },
            _ => ()
        }
    }

    Ok("schedulers initialized".to_string())
}


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

    // every other process_id, redirect
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
        /*
            we didn't find a process scheduler based on the tx_id
            so we need to try and find one based on process_id query param
        */
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

    let type_tag_value = if let Some(type_tag_match) = type_tag {
        type_tag_match.value.clone()
    } else {
        return Err("Cannot redirect data item, invalid Type Tag".to_string());
    };
    
    if type_tag_value == "Process" {
        // cannot recreate the ao staking process
        if id == deps.config.ao_process_id {
            return Err("Cannot recreate the ao staking process".to_string());
        }

        /*
            new process so we need to generate a
            process_schedulers record and return the url
        */
        let mut schedulers = deps.data_store.get_all_schedulers()?;

        if let Some(min_scheduler) = schedulers.iter_mut().min_by_key(|s| s.process_count) {
            // Increment the process_count of the selected scheduler
            min_scheduler.process_count += 1;
            // Update the scheduler in the database
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
                process_id: id.clone()
            };

            deps.data_store.save_process_scheduler(&process_scheduler)?;
            deps.data_store.update_scheduler(min_scheduler)?;

            return Ok(Some(min_scheduler.url.clone()));
        } else {
            return Err("Could not balance schedulers".to_string());
        }
    } else if type_tag_value == "Message" {
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
        let process_scheduler = deps.data_store.get_process_scheduler(&target)?;
        let scheduler = deps.data_store.get_scheduler(&process_scheduler.scheduler_row_id)?;
        return Ok(Some(scheduler.url.clone()));
        
    } else {
        return Err("Cannot redirect data item, invalid Type Tag".to_string());
    }
}