use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use reqwest::{Client, Url};

use super::super::core::dal::{
    Log,
    ProcessWhitelist,
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WhitelistJson {
    pub sus: HashMap<String, SuEntry>,
    pub processes: HashMap<String, ProcessEntry>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SuEntry {
    pub dbs: Vec<DbEntry>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DbEntry {
    pub db_name: String,
    pub efs_name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessEntry {
    pub su: String,
    pub db_name: String,
}

pub struct FileUrlWhitelist {
    whitelist: Arc<RwLock<WhitelistJson>>,
    own_url: String,
    router_mode: bool,
}

async fn fetch_whitelist(client: &Client, url: &Url) -> Result<WhitelistJson, String> {
    let resp = client
        .get(url.clone())
        .send()
        .await
        .map_err(|e| format!("request failed: {e:?}"))?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp
            .text()
            .await
            .unwrap_or_else(|_| "<failed to read body>".to_string());
        return Err(format!("whitelist fetch failed: status={status}, body={body}"));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("failed reading response bytes: {e:?}"))?;

    serde_json::from_slice(&bytes).map_err(|e| format!("invalid json: {e:?}"))
}

impl FileUrlWhitelist {
    pub async fn new(whitelist_url: &String, own_url: &String, logger: Arc<dyn Log>, router_mode: bool) -> Result<Self, String> {
        let url = Url::parse(whitelist_url).map_err(|e| format!("invalid url: {e:?}"))?;
        let client = Client::new();

        let whitelist = fetch_whitelist(&client, &url).await?;
        let whitelist = Arc::new(RwLock::new(whitelist));

        let whitelist_clone = whitelist.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
                match fetch_whitelist(&client, &url).await {
                    Ok(updated) => {
                        *whitelist_clone.write().unwrap() = updated;
                        logger.log("Process whitelist refreshed".to_string());
                    }
                    Err(e) => {
                        logger.error(format!("Failed to refresh process whitelist: {e}"));
                    }
                }
            }
        });

        Ok(Self { whitelist, own_url: own_url.clone(), router_mode })
    }

    fn own_dbs(&self) -> Vec<DbEntry> {
        self.whitelist.read().unwrap()
            .sus
            .get(&self.own_url)
            .map(|su| su.dbs.clone())
            .unwrap_or_default()
    }
}

impl ProcessWhitelist for FileUrlWhitelist {
    fn is_process_allowed(&self, process_id: String) -> bool {
        let whitelist = self.whitelist.read().unwrap();
        if self.router_mode {
            whitelist.processes.contains_key(&process_id)
        } else {
            whitelist.processes
                .get(&process_id)
                .map(|entry| entry.su == self.own_url)
                .unwrap_or(false)
        }
    }

    fn su_db_names(&self) -> Vec<String> {
        self.own_dbs().iter().map(|d| d.db_name.clone()).collect()
    }

    fn su_efs_names(&self) -> HashMap<String, String> {
        self.own_dbs().iter()
            .map(|d| (d.efs_name.clone(), d.db_name.clone()))
            .collect()
    }

    fn process_db_names(&self) -> HashMap<String, String> {
        self.whitelist.read().unwrap()
            .processes
            .iter()
            .filter(|(_, entry)| entry.su == self.own_url)
            .map(|(process_id, entry)| (process_id.clone(), entry.db_name.clone()))
            .collect()
    }
}
