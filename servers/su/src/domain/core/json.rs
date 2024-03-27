


use serde::{Serialize, Deserialize}; 
use sha2::{Digest, Sha256};

use super::bytes::{DataBundle};
use bundlr_sdk::{tags::*};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum JsonErrorType {
    JsonError(String)
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Owner {
    pub address: String,
    pub key: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Process {
    pub process_id: String,
    pub block: String,
    pub owner: Owner,
    pub tags: Vec<Tag>,
    pub timestamp: i64,
    pub data: Option<String>,
    pub anchor: Option<String>,
    pub signature: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageInner {
    pub id: String,
    pub owner: Owner,
    pub data: Option<String>,
    pub tags: Vec<Tag>,
    pub signature: String,
    pub anchor: Option<String>,
    pub target: Option<String>
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AssignmentInner {
    pub id: String,
    pub owner: Owner,
    pub tags: Vec<Tag>,
    pub signature: String,
    pub anchor: Option<String>,
    pub target: Option<String>
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Message {
    pub message: Option<MessageInner>,
    pub assignment: AssignmentInner
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
    pub fn from_bundle(data_bundle: &DataBundle) -> Result<Self, JsonErrorType> {
        let id = data_bundle.items[0].id().clone();
        let tags = data_bundle.items[0].tags();
        let owner = data_bundle.items[0].owner().clone();
        let signature = data_bundle.items[0].signature().clone();
        let data = data_bundle.items[0].data().clone();
        let anchor = data_bundle.items[0].anchor().clone();
        
        let owner_bytes = base64_url::decode(&owner)?;
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let bundle_tags = data_bundle.tags.clone();
        
        let block_tag = bundle_tags.iter().find(|tag| tag.name == "Block-Height")
            .ok_or("Block-Height tag not found")?;

        let timestamp_tag = bundle_tags.iter().find(|tag| tag.name == "Timestamp")
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
            _ => Some(ac)
        };

        Ok(Process {
            process_id: id,
            block: block,
            timestamp: timestamp,
            owner: owner,
            tags: tags,
            signature: Some(signature),
            anchor: anchor_r,
            data: data
        })
    }
}

impl Message {
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
            _ => Some(ac)
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
            target: Some(target)
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
                    _ => Some(ac)
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
                    target: Some(target)
                })
            },
            _ => None
        };

        Ok(Message {
            message: message_inner,
            assignment: assignment_inner
        })
    }

    pub fn epoch(&self) -> Result<i32, JsonErrorType> {
        let epoch_tag = self.assignment.tags.iter().find(|tag| tag.name == "Epoch")
            .ok_or("Epoch tag not found")?;
        Ok(epoch_tag.value.parse::<i32>()?)
    }

    pub fn nonce(&self) -> Result<i32, JsonErrorType> {
        let nonce_tag = self.assignment.tags.iter().find(|tag| tag.name == "Nonce")
            .ok_or("Nonce tag not found")?;
        Ok(nonce_tag.value.parse::<i32>()?)
    }

    pub fn timestamp(&self) -> Result<i64, JsonErrorType> {
        let timestamp_tag = self.assignment.tags.iter().find(|tag| tag.name == "Timestamp")
            .ok_or("Timestamp tag not found")?;
        Ok(timestamp_tag.value.parse::<i64>()?)
    }

    pub fn hash_chain(&self) -> Result<String, JsonErrorType> {
        let hash_chain_tag = self.assignment.tags.iter().find(|tag| tag.name == "Hash-Chain")
            .ok_or("Timestamp tag not found")?;
        Ok(hash_chain_tag.value.clone())
    }

    pub fn block_height(&self) -> Result<String, JsonErrorType> {
        let block_height_tag = self.assignment.tags.iter().find(|tag| tag.name == "Block-Height")
            .ok_or("Block-Height tag not found")?;
        Ok(block_height_tag.value.clone())
    }

    pub fn message_id(&self) -> Result<String, JsonErrorType> {
        let message_tag = self.assignment.tags.iter().find(|tag| tag.name == "Message")
            .ok_or("Message tag not found")?;
        Ok(message_tag.value.clone())
    }

    pub fn assignment_id(&self) -> Result<String, JsonErrorType> {
        let assignment_id = self.assignment.id.clone();
        Ok(assignment_id)
    }

    pub fn process_id(&self) -> Result<String, JsonErrorType> {
        let process_tag = self.assignment.tags.iter().find(|tag| tag.name == "Process")
            .ok_or("Process tag not found")?;
        Ok(process_tag.value.clone())
    }
}


impl PaginatedMessages {

    pub fn from_messages(messages: Vec<Message>, has_next_page: bool) -> Result<Self, JsonErrorType> {
        let page_info = PageInfo { has_next_page };
    
        let edges = messages.into_iter().try_fold(Vec::new(), |mut acc, message| {
            let timestamp = match message.timestamp() {
                Ok(t) => t.to_string(),
                Err(e) => return Err(e), 
            };
    
            acc.push(Edge {
                node: message.clone(),
                cursor: timestamp,
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
    const PROCESS_ITEM_STR: &str = "AQA5YulCH8FEFepbkO9yOSNbydtkkW02qWCinCnrO7En5gJ9HRV2o8XcKrk_FF3kwdNAylFeeDgFvWFsn9FZYxeliyp6bj_EKY8TLrhav-ysCqG4rp0q-RHl573XWB1EvFJNocA9sK1EBzLXFgTzVKDov_ND-PaZNXvxSHUGgXY9J8ro1YO7L_zY8VlM_G3x_Nq_fg4qDgOnvK8QgKuWiafoYtw0Tzob8vnllZe03HWrNgn4ZSMekZ7BDKjZ6ppKMfevYHXCEuzqu0KmiwLU25GuHhWJjNiMJ9KZieweXOswpV5ruNPeDtgKLTLJ8Du1RL2Ag5A_ZpakmJ8kRMP9PQuj6KR592JmajQj7SmryBO70GRMT-k0pm1C2K4B5K0rz9gcXxz0NPo82xJwrF0M-UZVDoxs9eK_JasjbzTmokizweDHNP1RBwOAqpPM1LPgvtlx84X1rRRsATOenpzx3tBPG_G_mjnfQNIEP6goUqt8G-bOaghSSr8NhzZ71uDdd1JEOf8N7xgicza7PATMTz2qSwB-8t6llnr0EONRlnEYfsUoWZBYzZK1tRZ4aImxSbJAvnhGcMalfuAeUtlmloQkWGGrs7mE2MLfBME64wfrsvLYfKjaX8a265IIBcuJdGakXW1hJKra0Ln8K3C55GtatTupWIiQcp--IZV6hDMzeYKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAAAHAAAAAAAAANYAAAAAAAAADiRTY2hlZHVsZWQtSW50ZXJ2YWwMMS1ob3VyIlNjaGVkdWxlZC1NZXNzYWdlXHsidGFncyI6W3sibmFtZSI6ImZ1bmN0aW9uIiwidmFsdWUiOiJoZWxsbyJ9XX0aRGF0YS1Qcm90b2NvbARhbw5hby10eXBlDnByb2Nlc3MYQ29udHJhY3QtU3JjVlY0Wl9vNzA0SUxrakZYNkR5OTN5Y29LZXJ5d2ZpcDk0ajA3ZFJqeE1DUHMYQ29udGVudC1UeXBlFHRleHQvcGxhaW4GU0RLBGFvADE3MDc";

    #[test]
    fn test_message_from_bundle() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
            Tag::new(&"Block-Height".to_string(), &"100".to_string()),
            Tag::new(&"Timestamp".to_string(), &"100".to_string()),
            Tag::new(&"Epoch".to_string(), &"0".to_string()),
            Tag::new(&"Nonce".to_string(), &"100".to_string()),
            Tag::new(&"Hash-Chain".to_string(), &"hash_chain".to_string()),
        ];
        let mut data_bundle = DataBundle::new(tags);
        data_bundle.add_item(data_item);
        let message = Message::from_bundle(&data_bundle).expect("failed to create message");
        assert_eq!(message.message.id, "6oYAxVAnH8yKsZKpMgHSbRv7uVWey68PAqYuSXeZBbg".to_string());
        assert_eq!(message.owner.address, "4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck".to_string());
        assert_eq!(message.process_id, "-oM8CYgbqsRcpI3tE_cpGM3kgDlamnYjSGA4nptPao0".to_string());
    }

    #[test]
    fn test_process_from_bundle() {
        let d_item_string = PROCESS_ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
            Tag::new(&"Block-Height".to_string(), &"100".to_string()),
            Tag::new(&"Timestamp".to_string(), &"100".to_string()),
        ];
        let mut data_bundle = DataBundle::new(tags);
        data_bundle.add_item(data_item);
        let process = Process::from_bundle(&data_bundle).expect("failed to create process");
        assert_eq!(process.owner.address, "4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck".to_string());
        assert_eq!(process.process_id, "boxXWZqkBaZmOKJ3Vh7PZzC07Q9OXmxF4QT_ikodfNY".to_string());
    }
}