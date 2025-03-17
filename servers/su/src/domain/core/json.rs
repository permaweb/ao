use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::bytes::{ByteErrorType, DataBundle, DataItem};
use super::tags::*;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum JsonErrorType {
    JsonError(String),
}

impl From<JsonErrorType> for String {
    fn from(error: JsonErrorType) -> Self {
        format!("Json error: {:?}", error)
    }
}

impl From<base64_url::base64::DecodeError> for JsonErrorType {
    fn from(error: base64_url::base64::DecodeError) -> Self {
        JsonErrorType::JsonError(format!("Json error: {:?}", error))
    }
}

impl From<&str> for JsonErrorType {
    fn from(error: &str) -> Self {
        JsonErrorType::JsonError(format!("Json error: {:?}", error))
    }
}

impl From<std::num::ParseIntError> for JsonErrorType {
    fn from(error: std::num::ParseIntError) -> Self {
        JsonErrorType::JsonError(format!("Json error: {:?}", error))
    }
}

impl From<serde_json::Error> for JsonErrorType {
    fn from(error: serde_json::Error) -> Self {
        JsonErrorType::JsonError(format!("Json error: {:?}", error))
    }
}

impl From<ByteErrorType> for JsonErrorType {
    fn from(error: ByteErrorType) -> Self {
        JsonErrorType::JsonError(format!("Json error: {:?}", error))
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Owner {
    pub address: String,
    pub key: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessInner {
    pub process_id: String,
    pub block: String,
    pub owner: Owner,
    pub tags: Vec<Tag>,
    pub timestamp: i64,
    pub data: Option<String>,
    pub anchor: Option<String>,
    pub signature: Option<String>,
    pub target: Option<String>,
}

/*
  Because Processes originally had no Assignment
  the assignemnt field is an Option here
*/
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Process {
    pub process: ProcessInner,
    pub assignment: Option<AssignmentInner>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageInner {
    pub id: String,
    pub owner: Owner,
    pub data: Option<String>,
    pub tags: Vec<Tag>,
    pub signature: String,
    pub anchor: Option<String>,
    pub target: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AssignmentInner {
    pub id: String,
    pub owner: Owner,
    pub tags: Vec<Tag>,
    pub signature: String,
    pub anchor: Option<String>,
    pub target: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Message {
    pub message: Option<MessageInner>,
    pub assignment: AssignmentInner,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PaginatedMessages {
    pub page_info: PageInfo,
    pub edges: Vec<Edge>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PageInfo {
    pub has_next_page: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Edge {
    pub node: Message,
    pub cursor: String,
}

pub fn hash(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    result.to_vec()
}

impl Process {
    pub fn from_bytes(bytes: Vec<u8>) -> Result<Self, JsonErrorType> {
        let data_item = DataItem::from_bytes(bytes)?;

        /*
          Parse bundle to determine if old or new
          structure. The old structure had no assignment.
        */
        let bundle_data = DataBundle::from_bytes(
            &data_item
                .data_bytes()
                .ok_or("Bundle data not present in DataItem")?,
        )?;

        match bundle_data.items.len() {
            2 => {
                /*
                  Current process structure, because it has an
                  assignment and a message
                */
                Ok(Process::from_bundle(&bundle_data)?)
            }
            1 => {
                /*
                  This is an old message structure so we have to
                  parse it differently.
                */
                Ok(Process::from_bundle_no_assign(&bundle_data, &data_item)?)
            }
            _ => {
                return Err(JsonErrorType::JsonError(
                    "Invalid Process Bundle".to_string(),
                ))
            }
        }
    }

    pub fn from_bundle(data_bundle: &DataBundle) -> Result<Self, JsonErrorType> {
        let id_assign = data_bundle.items[0].id().clone();
        let tags_assign = data_bundle.items[0].tags();
        let owner_assign = data_bundle.items[0].owner().clone();
        let target_assign = data_bundle.items[0].target().clone();
        let signature_assign = data_bundle.items[0].signature().clone();
        let anchor_assign = data_bundle.items[0].anchor().clone();

        let ac_assign = anchor_assign.clone();
        let anchor_r_assign = match &*anchor_assign {
            "" => None,
            _ => Some(ac_assign),
        };

        let owner_bytes_assign = base64_url::decode(&owner_assign)?;
        let address_hash_assign = hash(&owner_bytes_assign);
        let address_assign = base64_url::encode(&address_hash_assign);

        let owner_assign = Owner {
            address: address_assign,
            key: owner_assign,
        };

        let assignment_inner = AssignmentInner {
            id: id_assign,
            owner: owner_assign,
            tags: tags_assign,
            signature: signature_assign,
            anchor: anchor_r_assign,
            target: Some(target_assign),
        };

        let id = data_bundle.items[1].id().clone();
        let tags = data_bundle.items[1].tags();
        let target = match data_bundle.items[1].target().as_str() {
            "" => None,
            _ => Some(data_bundle.items[1].target().clone()),
        };
        let owner = data_bundle.items[1].owner().clone();
        let signature = data_bundle.items[1].signature().clone();
        let data = data_bundle.items[1].data_if_string().clone();
        let anchor = data_bundle.items[1].anchor().clone();

        let owner_bytes = base64_url::decode(&owner)?;
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let assignment_tags = data_bundle.items[0].tags().clone();

        let block_tag = assignment_tags
            .iter()
            .find(|tag| tag.name == "Block-Height")
            .ok_or("Block-Height tag not found")?;

        let timestamp_tag = assignment_tags
            .iter()
            .find(|tag| tag.name == "Timestamp")
            .ok_or("Timestamp tag not found")?;

        let block = block_tag.value.clone();
        let timestamp = timestamp_tag.value.clone().parse::<i64>()?;

        let owner = Owner {
            address: address,
            key: owner,
        };

        let ac = anchor.clone();
        let anchor_r = match &*anchor {
            "" => None,
            _ => Some(ac),
        };

        let process_inner = ProcessInner {
            process_id: id,
            block: block,
            timestamp: timestamp,
            owner: owner,
            tags: tags,
            target,
            signature: Some(signature),
            anchor: anchor_r,
            data: data,
        };

        Ok(Process {
            process: process_inner,
            assignment: Some(assignment_inner),
        })
    }

    /*
      for Processes pre aop6
    */
    pub fn from_bundle_no_assign(
        data_bundle: &DataBundle,
        bundle_data_item: &DataItem,
    ) -> Result<Self, JsonErrorType> {
        let id = data_bundle.items[0].id().clone();
        let tags = data_bundle.items[0].tags();
        let owner = data_bundle.items[0].owner().clone();
        let signature = data_bundle.items[0].signature().clone();
        let target = match data_bundle.items[0].target().as_str() {
            "" => None,
            _ => Some(data_bundle.items[0].target().clone()),
        };
        /*
        this is commented out because of this issue
        https://github.com/permaweb/ao/issues/994
        let data = data_bundle.items[0].data().clone();
        */
        let anchor = data_bundle.items[0].anchor().clone();
        let owner_bytes = base64_url::decode(&owner)?;
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let bundle_tags = bundle_data_item.tags().clone();

        let block_tag = bundle_tags
            .iter()
            .find(|tag| tag.name == "Block-Height")
            .ok_or("Block-Height tag not found")?;

        let timestamp_tag = bundle_tags
            .iter()
            .find(|tag| tag.name == "Timestamp")
            .ok_or("Timestamp tag not found")?;

        let block = block_tag.value.clone();
        let timestamp = timestamp_tag.value.clone().parse::<i64>()?;

        let owner = Owner {
            address: address,
            key: owner,
        };

        let ac = anchor.clone();
        let anchor_r = match &*anchor {
            "" => None,
            _ => Some(ac),
        };

        let process_inner = ProcessInner {
            process_id: id,
            block: block,
            timestamp: timestamp,
            owner: owner,
            tags: tags,
            signature: Some(signature),
            anchor: anchor_r,
            data: None,
            target,
        };

        Ok(Process {
            process: process_inner,
            assignment: None,
        })
    }

    pub fn epoch(&self) -> Result<i32, JsonErrorType> {
        match &self.assignment {
            Some(a) => {
                let epoch_tag = a
                    .tags
                    .iter()
                    .find(|tag| tag.name == "Epoch")
                    .ok_or("Epoch tag not found")?;
                Ok(epoch_tag.value.parse::<i32>()?)
            }
            None => Err(JsonErrorType::JsonError(
                "No Assignment on Process".to_string(),
            )),
        }
    }

    pub fn nonce(&self) -> Result<i32, JsonErrorType> {
        match &self.assignment {
            Some(a) => {
                let nonce_tag = a
                    .tags
                    .iter()
                    .find(|tag| tag.name == "Nonce")
                    .ok_or("Nonce tag not found")?;
                Ok(nonce_tag.value.parse::<i32>()?)
            }
            None => Err(JsonErrorType::JsonError(
                "No Assignment on Process".to_string(),
            )),
        }
    }

    pub fn timestamp(&self) -> Result<i64, JsonErrorType> {
        match &self.assignment {
            Some(a) => {
                let timestamp_tag = a
                    .tags
                    .iter()
                    .find(|tag| tag.name == "Timestamp")
                    .ok_or("Timestamp tag not found")?;
                Ok(timestamp_tag.value.parse::<i64>()?)
            }
            None => Err(JsonErrorType::JsonError(
                "No Assignment on Process".to_string(),
            )),
        }
    }

    pub fn hash_chain(&self) -> Result<String, JsonErrorType> {
        match &self.assignment {
            Some(a) => {
                let hash_chain_tag = a
                    .tags
                    .iter()
                    .find(|tag| tag.name == "Hash-Chain")
                    .ok_or("Timestamp tag not found")?;
                Ok(hash_chain_tag.value.clone())
            }
            None => Err(JsonErrorType::JsonError(
                "No Assignment on Process".to_string(),
            )),
        }
    }

    pub fn assignment_id(&self) -> Result<String, JsonErrorType> {
        match &self.assignment {
            Some(a) => Ok(a.id.clone()),
            None => Err(JsonErrorType::JsonError(
                "No Assignment on Process".to_string(),
            )),
        }
    }

    pub fn from_val(value: &serde_json::Value) -> Result<Self, JsonErrorType> {
        match value.get("assignment") {
            Some(_) => {
                /*
                    Current process structure we can directly
                    parse it using the current shape
                */
                let process: Process = serde_json::from_value(value.clone())?;
                Ok(process)
            }
            None => {
                /*
                    old process structure so there is no Assignment
                */
                let old: ProcessInner = serde_json::from_value(value.clone())?;
                let assignment = None;

                Ok(Process {
                    process: old,
                    assignment,
                })
            }
        }
    }
}

impl Message {
    pub fn from_bytes(bytes: Vec<u8>) -> Result<Self, JsonErrorType> {
        let data_item = DataItem::from_bytes(bytes)?;
        let top_level_tags = data_item.tags();

        /*
          using arbitrary tag at the top level to check if
          old structure, old structure had protocol tags on
          the top level DataItem
        */
        let epoch_tag = top_level_tags.iter().find(|tag| tag.name == "Epoch");

        match epoch_tag {
            None => {
                /*
                  Current message structure, because the tags are
                  not present at the top level data item.
                */
                let bundle_data = DataBundle::from_bytes(
                    &data_item
                        .data_bytes()
                        .ok_or("Bundle data not present in DataItem")?,
                )?;
                Ok(Message::from_bundle(&bundle_data)?)
            }
            Some(_) => {
                /*
                  This is an old message structure so we have to
                  parse it differently.
                */
                let owner = data_item.owner();
                let owner_bytes = base64_url::decode(&owner)?;
                let address_hash = hash(&owner_bytes);
                let address = base64_url::encode(&address_hash);

                let anchor = match data_item.anchor().is_empty() {
                    true => None,
                    false => Some(data_item.anchor()),
                };

                let target = match data_item.target().is_empty() {
                    true => None,
                    false => Some(data_item.target()),
                };

                let assignment: AssignmentInner = AssignmentInner {
                    id: data_item.id(),
                    owner: Owner {
                        address: address,
                        key: owner,
                    },
                    tags: data_item.tags(),
                    signature: data_item.signature(),
                    anchor,
                    target,
                };

                let bundle_data = DataBundle::from_bytes(
                    &data_item
                        .data_bytes()
                        .ok_or("Bundle data not present in DataItem")?,
                )?;

                let m_id = bundle_data.items[0].id();
                let m_tags = bundle_data.items[0].tags();
                let m_owner = bundle_data.items[0].owner();
                let m_target = bundle_data.items[0].target();
                let m_signature = bundle_data.items[0].signature();
                let m_data = bundle_data.items[0].data();
                let m_anchor = bundle_data.items[0].anchor();

                let ac = m_anchor.clone();
                let m_anchor_r = match &*m_anchor {
                    "" => None,
                    _ => Some(ac),
                };

                let m_owner_bytes = base64_url::decode(&m_owner)?;
                let m_address_hash = hash(&m_owner_bytes);
                let m_address = base64_url::encode(&m_address_hash);

                let m_owner = Owner {
                    address: m_address,
                    key: m_owner,
                };

                let message_inner = Some(MessageInner {
                    id: m_id,
                    data: m_data,
                    owner: m_owner,
                    tags: m_tags,
                    signature: m_signature,
                    anchor: m_anchor_r,
                    target: Some(m_target),
                });

                Ok(Message {
                    message: message_inner,
                    assignment,
                })
            }
        }
    }

    pub fn from_bundle(data_bundle: &DataBundle) -> Result<Self, JsonErrorType> {
        let id = data_bundle.items[0].id().clone();
        let tags = data_bundle.items[0].tags();
        let owner = data_bundle.items[0].owner().clone();
        let target = data_bundle.items[0].target().clone();
        let signature = data_bundle.items[0].signature().clone();
        let anchor = data_bundle.items[0].anchor().clone();

        let ac = anchor.clone();
        let anchor_r = match &*anchor {
            "" => None,
            _ => Some(ac),
        };

        let owner_bytes = base64_url::decode(&owner)?;
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let owner = Owner {
            address: address,
            key: owner,
        };

        let assignment_inner = AssignmentInner {
            id,
            owner,
            tags,
            signature,
            anchor: anchor_r,
            target: Some(target),
        };

        let message_inner = match data_bundle.items.len() {
            // bundle is just an assignment
            1 => None,
            // bundle contains a message and an assignment
            2 => {
                let id = data_bundle.items[1].id().clone();
                let tags = data_bundle.items[1].tags();
                let owner = data_bundle.items[1].owner().clone();
                let target = data_bundle.items[1].target().clone();
                let signature = data_bundle.items[1].signature().clone();
                let data = data_bundle.items[1].data().clone();
                let anchor = data_bundle.items[1].anchor().clone();

                let ac = anchor.clone();
                let anchor_r = match &*anchor {
                    "" => None,
                    _ => Some(ac),
                };

                let owner_bytes = base64_url::decode(&owner)?;
                let address_hash = hash(&owner_bytes);
                let address = base64_url::encode(&address_hash);

                let owner = Owner {
                    address: address,
                    key: owner,
                };

                Some(MessageInner {
                    id,
                    data,
                    owner,
                    tags,
                    signature,
                    anchor: anchor_r,
                    target: Some(target),
                })
            }
            _ => None,
        };

        Ok(Message {
            message: message_inner,
            assignment: assignment_inner,
        })
    }

    /*
      This is used to insert the Process as the first
      Message in the paginated list. If it has no Assignment
      it shouldn't be used as the first Message so we
      throw an error.
    */
    pub fn from_process(process: Process) -> Result<Self, JsonErrorType> {
        let assignment_inner = match process.assignment {
            Some(assignment) => assignment,
            None => {
                return Err(JsonErrorType::JsonError(
                    "Process does not contain an assignment".to_string(),
                ));
            }
        };

        let message_inner = Some(MessageInner {
            id: process.process.process_id,
            owner: process.process.owner,
            data: process.process.data,
            tags: process.process.tags,
            signature: process.process.signature.unwrap_or_default(),
            anchor: process.process.anchor,
            target: process.process.target,
        });

        Ok(Message {
            message: message_inner,
            assignment: assignment_inner,
        })
    }

    pub fn epoch(&self) -> Result<i32, JsonErrorType> {
        let epoch_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Epoch")
            .ok_or("Epoch tag not found")?;
        Ok(epoch_tag.value.parse::<i32>()?)
    }

    pub fn nonce(&self) -> Result<i32, JsonErrorType> {
        let nonce_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Nonce")
            .ok_or("Nonce tag not found")?;
        Ok(nonce_tag.value.parse::<i32>()?)
    }

    pub fn timestamp(&self) -> Result<i64, JsonErrorType> {
        let timestamp_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Timestamp")
            .ok_or("Timestamp tag not found")?;
        Ok(timestamp_tag.value.parse::<i64>()?)
    }

    pub fn hash_chain(&self) -> Result<String, JsonErrorType> {
        let hash_chain_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Hash-Chain")
            .ok_or("Timestamp tag not found")?;
        Ok(hash_chain_tag.value.clone())
    }

    pub fn block_height(&self) -> Result<String, JsonErrorType> {
        let block_height_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Block-Height")
            .ok_or("Block-Height tag not found")?;
        Ok(block_height_tag.value.clone())
    }

    pub fn message_id(&self) -> Result<String, JsonErrorType> {
        if let Some(message) = &self.message {
            return Ok(message.id.clone());
        }
        let message_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Message")
            .ok_or("Message tag not found")?;
        Ok(message_tag.value.clone())
    }

    pub fn assignment_id(&self) -> Result<String, JsonErrorType> {
        let assignment_id = self.assignment.id.clone();
        Ok(assignment_id)
    }

    pub fn process_id(&self) -> Result<String, JsonErrorType> {
        let process_tag = self
            .assignment
            .tags
            .iter()
            .find(|tag| tag.name == "Process")
            .ok_or("Process tag not found")?;
        Ok(process_tag.value.clone())
    }

    /*
        This code is to handle mapping from the old
        json structure before the aop-1 was added to
        handle assign. If the shape changes again
        we can modify this mapping to handle it.
    */
    pub fn from_val(value: &serde_json::Value, bundle: Vec<u8>) -> Result<Self, JsonErrorType> {
        match value.get("assignment") {
            Some(_) => {
                /*
                    Current message structure we can directly
                    parse it using the current shape
                */
                let message: Message = serde_json::from_value(value.clone())?;
                Ok(message)
            }
            None => {
                /*
                    old message structure so we have to break
                    down the json by field
                */
                let old_message = extract_val(&value, "message")?;
                let message_owner = serde_json::from_value(extract_val(&value, "owner")?)?;
                let message_data = extract_option_str(&value, "data");
                let message_target = extract_option_str(&value, "process_id");

                let message_id = str_val(&extract_val(&old_message, "id")?)?;
                let message_tags = to_tags(&extract_val(&old_message, "tags")?)?;
                let message_signature = str_val(&extract_val(&old_message, "signature")?)?;
                let message_anchor = extract_option_str(&old_message, "data");

                // there is always a message in the old structure
                let message: Option<MessageInner> = Some(MessageInner {
                    id: message_id,
                    owner: message_owner,
                    data: message_data,
                    tags: message_tags,
                    signature: message_signature,
                    anchor: message_anchor,
                    target: message_target,
                });

                let bundle_data_item = DataItem::from_bytes(bundle)?;

                let owner = bundle_data_item.owner();
                let owner_bytes = base64_url::decode(&owner)?;
                let address_hash = hash(&owner_bytes);
                let address = base64_url::encode(&address_hash);

                let anchor = match bundle_data_item.anchor().is_empty() {
                    true => None,
                    false => Some(bundle_data_item.anchor().clone()),
                };

                let target = match bundle_data_item.target().is_empty() {
                    true => None,
                    false => Some(bundle_data_item.target().clone()),
                };

                let assignment: AssignmentInner = AssignmentInner {
                    id: bundle_data_item.id(),
                    owner: Owner {
                        address: address,
                        key: owner,
                    },
                    tags: bundle_data_item.tags(),
                    signature: bundle_data_item.signature(),
                    anchor,
                    target,
                };

                Ok(Message {
                    message,
                    assignment,
                })
            }
        }
    }
}

fn extract_val(val: &serde_json::Value, prop: &str) -> Result<serde_json::Value, JsonErrorType> {
    match val.get(prop) {
        Some(v) => Ok(v.clone()),
        None => Err(JsonErrorType::JsonError("Item missing field".to_string())),
    }
}

fn extract_option_str(val: &serde_json::Value, prop: &str) -> Option<String> {
    match val.get(prop) {
        Some(v) => v.as_str().map(|s| s.to_string()),
        None => None,
    }
}

fn str_val(val: &serde_json::Value) -> Result<String, JsonErrorType> {
    match val.as_str().map(|s| s.to_string()) {
        Some(f) => Ok(f),
        None => Err(JsonErrorType::JsonError("invalid string field".to_string())),
    }
}

fn to_tags(val: &serde_json::Value) -> Result<Vec<Tag>, JsonErrorType> {
    if let Some(tags_array) = val.as_array() {
        let mut tags: Vec<Tag> = vec![];
        for tag in tags_array {
            if let (Some(name), Some(value)) = (tag.get("name"), tag.get("value")) {
                if let (Some(name_str), Some(value_str)) = (name.as_str(), value.as_str()) {
                    tags.push(Tag::new(&name_str, &value_str));
                }
            }
        }
        Ok(tags)
    } else {
        Err(JsonErrorType::JsonError("Invalid tags".to_string()))
    }
}

impl PaginatedMessages {
    pub fn from_messages(
        messages: Vec<Message>,
        has_next_page: bool,
        sequence_mode: &'static str,
    ) -> Result<Self, JsonErrorType> {
        let page_info = PageInfo { has_next_page };

        let edges = messages
            .into_iter()
            .try_fold(Vec::new(), |mut acc, message| {
                let cursor = match sequence_mode {
                  "timestamp" => {
                      match message.timestamp() {
                          Ok(t) => t.to_string(),
                          Err(e) => return Err(e),
                      }
                  },
                  "nonce" => {
                      match message.nonce() {
                          Ok(t) => t.to_string(),
                          Err(e) => return Err(e),
                      }
                  },
                  _ => return Err(JsonErrorType::JsonError("Invalid sequence mode".to_string()))
                };

                acc.push(Edge {
                    node: message.clone(),
                    cursor,
                });

                Ok(acc)
            })?;

        Ok(PaginatedMessages { page_info, edges })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::core::bytes::DataItem;

    const ITEM_STR: &str = "AQB9q2yhsQlBHv2LOTIrtmKjw063S1DG0prKcq86DykIegmPnXOReXkWXwpqXt4YxTRw6Rw1jG7f1QFF5ReoJO2MrJmia9ymkTmnhamv3lsYYIotBC6U4Bmzo6IZiKmn2llJt0MDvCe8rxzG15vvff9bpnDIVflY_Dm9Y0dCH-w2Xg8rb2xLq-cM8SBoNRiYruwcwpahiHTjXcxboJKksZRXaI_E7_7vL1gWlMLqeYeF_uXqkth8_PGtZcqMA7pbTYcRzGki_rifGXKUIZKgSIRXTk54iboiqNzOklIFpDKDJpC9Xk_6ppSw_Xzs8S0KpR-veBL8TeURtGhrsDecu_36Pk2MMvdZedxiAg7bvQ9H_NZecoZcju-sQKZiE7haq9Nos3g6njh9IpXivGJ1k8tRLeox7hXOeynffzcXz1Vnz5c4Zxw8LKUbLygni49sflKyFTMnQ8sgDw00fPsuhrznq37-2OLhmYe-tIg-TEV3T4VNdqchzeRSFIv_l7ZJcxeFxcEgdq9aXMx2yzVhSInFuk_W8fJSbhPKX9cewbr4BA_XUNMReowLVcnjB_19iCWnivkVk9sz-QRbjuVL2IMqZePWcRdN5ncXRJoYv4F-Z4FfXDCFuyCD4UAtiQfdch-S4KvRf99DwKrZrMIF28MDdRFdE3ZGDs3FXcPuN8eMLoKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAUAAAAAAAAASAAAAAAAAAAKGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3GkRhdGEtUHJvdG9jb2wEYW8OYW8tdHlwZQ5tZXNzYWdlBlNESwRhbwA2NTgz";
    const ASSIGNMENT_ITEM_STR: &str = "AQAkDPhXPPKneu8tEHf_EG07qX84yOQRFYPPAsK3ZakHplObJY6XAuWIN5cb-UJ_dFSbbqdryLnAQNFLWrhWXqePWZ3G__TIkPE2QrubXJZ9dyQ_Gw8I-kJTzLF6PtXAT5B89lgCKTVXA8Sjm5eYcMPb_1bBTAJg_R-ZJXYDXHqJY3BkLHuU-UXwr5UuZDKAYTUzl-Veb7BzgufbZbxZUoEGaHgqWnqTQIkI74oDzJnfufy-F6-vFmjAtFrRgcxXAod2WH-lrWraQf5PPDTmokVbtj786Gzzf_KGMEt6RqmYKTdk_1FBcxudD3GyPSic_He7xTY629xDsgZhZtRHmEfysn4JxHWT4_0UxXmYhXiEttWNJOqF_3py3HaJpfuXPZq3rjiLavWAH9Fu-cGFz5cSjZ0thfUbFJk0JUZ9GSmUqEdfF-vuJDPS7jKWdZ5KzllH_Q6myG_OV6-UFe-wgrE0iT5ry11J8o6s5_nRxjbAs1O0v_DRRjPzTyMP0Eh2xAIBzNyUmzVbwSTLInnBBE8r62Y_EUlbnE8CWT3mo04VHNA3lNU9u7lIji4LHcfx7o0c_Vx-3bowB3YrnzXyV8gKG7xzV7qLzSbsyTYr5yht7GpTb73XmjZ7aUbGIzy0tjTm7vKRce9aFoWIJvoNdS7kRlo7R0mpjl-0MflV-8kjHaHCi1TQqz0n1N-v-pcmm0m2nuSyEWh3pC9-vi4UilQqsSfaPSu8UBWRj31XVYwIvBVBhM3FDP8Ugwu8z-IDz9Psa4gmHkbGo30ltC7oASVLmaQl9ftRPFWow9wvNWQMkWEMrGERdYqDNeEFzCT95FUfIKWrYWDgq0aQPx0DUuahLgL_zsEJDeqrsZdUl7th7raeATIv2GPPOlyhPEKaYVReM63DZE4AE8fvnX2BjOkivfbZ6jWhDltt69qN26P3ZrwCrYC7KtFmbQ9Oy_AyM4hbG5BRWl5eESk9kY_9Rg95AgJ9inD2H0eigm-AaHBuNt16Eq88dbEUYjLbE5kviR84QUX3ENLCD2Ti2aXdrdBwas2KSMN_zmNloH98i17BMofZ2VqI-UAVmYfIWgEKtynpLiuqz5IBTfyTYK2fdYnKFxYvAV9xhMYVGpknTQ0YMQVkKY_pVVFDsAtXYw_NH_bVoQr-EZoy20U2OFj2tF-OshxAtERLm2a97v-0MO3bhjbAjVKVDNP61y7iOzvh7ihA3qa4rJeIi1PA31BtDp0frWTla_4ZH0YxcDKqFUIl0SrD16gpnS4Ki7ZkHxbWtTK_dIppdEVDcHF5cuEXQk4kgkRWnAKO4c2FOm6uuKA8H_4HJ_PLODoOu937HSyxh-KTtcfW4zTsC5sfOtYW92dbAAGQ81jLUtsy-dwGPlIcHGPKJ0F0ZVcw2wNqWFGYblfFMgcAAAAAAAAA4wAAAAAAAAAODlByb2Nlc3NWNGlaYVhhcnlRM2VlQ0RCXzJaUzRXbUVUNkRUbTM1UXVrSTZkTkVoUVBtdw5NZXNzYWdlVkZSbHcwaGJrMS1ubEFiSjJEYk1td3FHVjh1NnJXZ3JGWUpXam0xbUJNamsKRXBvY2gCMApOb25jZQIxFEhhc2gtQ2hhaW5WLUlDemZ3SVh3dDFIM2hXVndlM0Q4WVFOVDJsVTk5V01NWkJyX1FhNTNQMBhCbG9jay1IZWlnaHQYMDAwMDAxMzkzMDA4ElRpbWVzdGFtcBoxNzExNjc2NjM4NDcxAA";
    const PROCESS_ITEM_STR: &str = "AQA5YulCH8FEFepbkO9yOSNbydtkkW02qWCinCnrO7En5gJ9HRV2o8XcKrk_FF3kwdNAylFeeDgFvWFsn9FZYxeliyp6bj_EKY8TLrhav-ysCqG4rp0q-RHl573XWB1EvFJNocA9sK1EBzLXFgTzVKDov_ND-PaZNXvxSHUGgXY9J8ro1YO7L_zY8VlM_G3x_Nq_fg4qDgOnvK8QgKuWiafoYtw0Tzob8vnllZe03HWrNgn4ZSMekZ7BDKjZ6ppKMfevYHXCEuzqu0KmiwLU25GuHhWJjNiMJ9KZieweXOswpV5ruNPeDtgKLTLJ8Du1RL2Ag5A_ZpakmJ8kRMP9PQuj6KR592JmajQj7SmryBO70GRMT-k0pm1C2K4B5K0rz9gcXxz0NPo82xJwrF0M-UZVDoxs9eK_JasjbzTmokizweDHNP1RBwOAqpPM1LPgvtlx84X1rRRsATOenpzx3tBPG_G_mjnfQNIEP6goUqt8G-bOaghSSr8NhzZ71uDdd1JEOf8N7xgicza7PATMTz2qSwB-8t6llnr0EONRlnEYfsUoWZBYzZK1tRZ4aImxSbJAvnhGcMalfuAeUtlmloQkWGGrs7mE2MLfBME64wfrsvLYfKjaX8a265IIBcuJdGakXW1hJKra0Ln8K3C55GtatTupWIiQcp--IZV6hDMzeYKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAAAHAAAAAAAAANYAAAAAAAAADiRTY2hlZHVsZWQtSW50ZXJ2YWwMMS1ob3VyIlNjaGVkdWxlZC1NZXNzYWdlXHsidGFncyI6W3sibmFtZSI6ImZ1bmN0aW9uIiwidmFsdWUiOiJoZWxsbyJ9XX0aRGF0YS1Qcm90b2NvbARhbw5hby10eXBlDnByb2Nlc3MYQ29udHJhY3QtU3JjVlY0Wl9vNzA0SUxrakZYNkR5OTN5Y29LZXJ5d2ZpcDk0ajA3ZFJqeE1DUHMYQ29udGVudC1UeXBlFHRleHQvcGxhaW4GU0RLBGFvADE3MDc";

    #[test]
    fn test_message_from_bundle() {
        let d_item_string = ITEM_STR.to_string();
        let a_d_item_string = ASSIGNMENT_ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let assignment_item_bytes =
            base64_url::decode(&a_d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let assignment_data_item =
            DataItem::from_bytes(assignment_item_bytes).expect("failed to build data item");
        let mut data_bundle = DataBundle::new();
        data_bundle.add_item(assignment_data_item);
        data_bundle.add_item(data_item);
        let message = Message::from_bundle(&data_bundle).expect("failed to create message");
        let m = message.clone().message.unwrap();
        assert_eq!(
            message.message_id().unwrap(),
            "6oYAxVAnH8yKsZKpMgHSbRv7uVWey68PAqYuSXeZBbg".to_string()
        );
        assert_eq!(
            m.owner.address,
            "4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck".to_string()
        );
        assert_eq!(
            message.process_id().unwrap(),
            "4iZaXaryQ3eeCDB_2ZS4WmET6DTm35QukI6dNEhQPmw".to_string()
        );
    }

    #[test]
    fn test_from_bundle() {
        let d_item_string = PROCESS_ITEM_STR.to_string();
        let a_d_item_string = ASSIGNMENT_ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let assignment_item_bytes =
            base64_url::decode(&a_d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let assignment_data_item =
            DataItem::from_bytes(assignment_item_bytes).expect("failed to build data item");
        let mut data_bundle = DataBundle::new();
        data_bundle.add_item(assignment_data_item);
        data_bundle.add_item(data_item);
        let process = Process::from_bundle(&data_bundle).expect("failed to create process");
        assert_eq!(
            process.process.owner.address,
            "4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck".to_string()
        );
        assert_eq!(
            process.process.process_id,
            "boxXWZqkBaZmOKJ3Vh7PZzC07Q9OXmxF4QT_ikodfNY".to_string()
        );
    }
}
