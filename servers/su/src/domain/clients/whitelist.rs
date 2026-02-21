use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use reqwest::{Client, Url};

use super::super::core::dal::{
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
    whitelist: WhitelistJson,
    own_url: String,
}

impl FileUrlWhitelist {
    pub async fn new(whitelist_url: &String, own_url: &String) -> Result<Self, String> {
        let url = Url::parse(whitelist_url).map_err(|e| format!("invalid url: {e:?}"))?;
        let client = Client::new();

        let resp = client
            .get(url)
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

        let whitelist: WhitelistJson =
            serde_json::from_slice(&bytes).map_err(|e| format!("invalid json: {e:?}"))?;

        Ok(Self { whitelist, own_url: own_url.clone() })
    }

    fn own_dbs(&self) -> &[DbEntry] {
        self.whitelist.sus
            .get(&self.own_url)
            .map(|su| su.dbs.as_slice())
            .unwrap_or(&[])
    }
}

impl ProcessWhitelist for FileUrlWhitelist {
    fn is_process_allowed(&self, process_id: String) -> bool {
        self.whitelist.processes
            .get(&process_id)
            .map(|entry| entry.su == self.own_url)
            .unwrap_or(false)
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
        self.whitelist.processes
            .iter()
            .filter(|(_, entry)| entry.su == self.own_url)
            .map(|(process_id, entry)| (process_id.clone(), entry.db_name.clone()))
            .collect()
    }
}
