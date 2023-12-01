


use serde::{Serialize, Deserialize}; 

use super::bytes::{DataBundle};
use super::sequencer::hash;
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageInner {
    pub id: String,
    pub tags: Vec<Tag>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Block {
    pub height: u64,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Owner {
    pub address: String,
    pub key: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Process {
    pub process_id: String,
    pub block: Option<Block>,
    pub owner: Owner,
    pub sort_key: String,
    pub tags: Vec<Tag>
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Message {
    pub message: MessageInner,
    pub block: Option<Block>,
    pub owner: Owner,
    pub sort_key: String,
    pub process_id: String,
    pub data: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SortedMessages {
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

fn parse_sort_key(sort_key: &String) -> Result<Block, JsonErrorType> {
    let mut parts = sort_key.split(',');
    let height_str = match parts.next() {
        Some(h) => h,
        None => return Err(JsonErrorType::JsonError("No height in sort key".to_string()))
    };
    let height = match height_str.parse::<u64>() {
        Ok(h) => h,
        Err(_) => return Err(JsonErrorType::JsonError("Invalid height in sort key".to_string()))
    };

    let timestamp_str = match parts.next() {
        Some(h) => h,
        None => return Err(JsonErrorType::JsonError("No timstamp in sort key".to_string()))
    };
    let timestamp = match timestamp_str.parse::<u64>() {
        Ok(h) => h,
        Err(_) => return Err(JsonErrorType::JsonError("Invalid timestamp in sort key".to_string()))
    }; 

    Ok(Block {
        height: height,
        timestamp: timestamp
    })
}

impl Process {
    pub fn from_bundle(data_bundle: &DataBundle) -> Result<Self, JsonErrorType> {
        let id = data_bundle.items[0].id().clone();
        let sort_key_clone = data_bundle.sort_key.clone();
        let tags = data_bundle.items[0].tags();
        let owner = data_bundle.items[0].owner().clone();
       
        let block = parse_sort_key(&sort_key_clone)?;
        
        // TODO: implement a from on the owner struct
        let owner_bytes = base64_url::decode(&owner)?;
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let owner = Owner {
            address: address,
            key: owner,
        };

        Ok(Process {
            process_id: id,
            block: Some(block),
            owner: owner,
            tags: tags,
            sort_key: sort_key_clone
        })
    }
}

impl Message {
    pub fn from_bundle(data_bundle: &DataBundle) -> Result<Self, JsonErrorType> {
        let id = data_bundle.items[0].id().clone();
        let sort_key_clone = data_bundle.sort_key.clone();
        let tags = data_bundle.items[0].tags();
        let owner = data_bundle.items[0].owner().clone();
        let target = data_bundle.items[0].target().clone();
        let data = data_bundle.items[0].data().clone();

        let message_inner = MessageInner {
            id: id,
            tags: tags,
        };

        let owner_bytes = base64_url::decode(&owner)?;
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let owner = Owner {
            address: address,
            key: owner,
        };

        let process_id = target;

        let block = parse_sort_key(&sort_key_clone)?;

        Ok(Message {
            message: message_inner,
            block: Some(block),
            owner,
            sort_key: sort_key_clone,
            process_id,
            data: data
        })
    }
}

impl SortedMessages {

    pub fn from_messages(messages: Vec<Message>, from: Option<String>, to: Option<String>) -> Result<Self, JsonErrorType> {
        let mut sorted_messages = messages.clone();
        
        sorted_messages.sort_by(|a, b| {
            let a_timestamp = extract_timestamp(&a.sort_key);
            let b_timestamp = extract_timestamp(&b.sort_key);
            a_timestamp.cmp(&b_timestamp)
        });

        let from_timestamp = match from.as_ref().map(|from_str| extract_timestamp(from_str)){
            Some(t) => t,
            None => 0
        };

        let to_timestamp = match to.as_ref().map(|to_str| extract_timestamp(to_str)) {
            Some(t) => t,
            None => std::i64::MAX
        };

        let filtered_messages: Vec<Message> = sorted_messages.into_iter().filter(|message| {
            let message_timestamp = extract_timestamp(&message.sort_key);
            message_timestamp > from_timestamp && message_timestamp <= to_timestamp
        }).collect();

        let page_info = PageInfo { has_next_page: false };

        let edges = filtered_messages.into_iter().map(|message| Edge {
            node: message.clone(),
            cursor: message.sort_key.clone(),
        }).collect();

        Ok(SortedMessages { page_info, edges })
    }
}

fn extract_timestamp(sort_key: &str) -> i64 {
    let parts: Vec<&str> = sort_key.split(',').collect();
    if parts.len() >= 2 {
        let num: Result<i64, _> = parts[1].parse();
        if let Ok(timestamp) = num {
            return timestamp;
        } else {
            return -1;
        }
    }
    -1
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::core::bytes::DataItem;

    const ITEM_STR: &str = "AQB9q2yhsQlBHv2LOTIrtmKjw063S1DG0prKcq86DykIegmPnXOReXkWXwpqXt4YxTRw6Rw1jG7f1QFF5ReoJO2MrJmia9ymkTmnhamv3lsYYIotBC6U4Bmzo6IZiKmn2llJt0MDvCe8rxzG15vvff9bpnDIVflY_Dm9Y0dCH-w2Xg8rb2xLq-cM8SBoNRiYruwcwpahiHTjXcxboJKksZRXaI_E7_7vL1gWlMLqeYeF_uXqkth8_PGtZcqMA7pbTYcRzGki_rifGXKUIZKgSIRXTk54iboiqNzOklIFpDKDJpC9Xk_6ppSw_Xzs8S0KpR-veBL8TeURtGhrsDecu_36Pk2MMvdZedxiAg7bvQ9H_NZecoZcju-sQKZiE7haq9Nos3g6njh9IpXivGJ1k8tRLeox7hXOeynffzcXz1Vnz5c4Zxw8LKUbLygni49sflKyFTMnQ8sgDw00fPsuhrznq37-2OLhmYe-tIg-TEV3T4VNdqchzeRSFIv_l7ZJcxeFxcEgdq9aXMx2yzVhSInFuk_W8fJSbhPKX9cewbr4BA_XUNMReowLVcnjB_19iCWnivkVk9sz-QRbjuVL2IMqZePWcRdN5ncXRJoYv4F-Z4FfXDCFuyCD4UAtiQfdch-S4KvRf99DwKrZrMIF28MDdRFdE3ZGDs3FXcPuN8eMLoKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAUAAAAAAAAASAAAAAAAAAAKGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3GkRhdGEtUHJvdG9jb2wEYW8OYW8tdHlwZQ5tZXNzYWdlBlNESwRhbwA2NTgz";
    const PROCESS_ITEM_STR: &str = "AQA5YulCH8FEFepbkO9yOSNbydtkkW02qWCinCnrO7En5gJ9HRV2o8XcKrk_FF3kwdNAylFeeDgFvWFsn9FZYxeliyp6bj_EKY8TLrhav-ysCqG4rp0q-RHl573XWB1EvFJNocA9sK1EBzLXFgTzVKDov_ND-PaZNXvxSHUGgXY9J8ro1YO7L_zY8VlM_G3x_Nq_fg4qDgOnvK8QgKuWiafoYtw0Tzob8vnllZe03HWrNgn4ZSMekZ7BDKjZ6ppKMfevYHXCEuzqu0KmiwLU25GuHhWJjNiMJ9KZieweXOswpV5ruNPeDtgKLTLJ8Du1RL2Ag5A_ZpakmJ8kRMP9PQuj6KR592JmajQj7SmryBO70GRMT-k0pm1C2K4B5K0rz9gcXxz0NPo82xJwrF0M-UZVDoxs9eK_JasjbzTmokizweDHNP1RBwOAqpPM1LPgvtlx84X1rRRsATOenpzx3tBPG_G_mjnfQNIEP6goUqt8G-bOaghSSr8NhzZ71uDdd1JEOf8N7xgicza7PATMTz2qSwB-8t6llnr0EONRlnEYfsUoWZBYzZK1tRZ4aImxSbJAvnhGcMalfuAeUtlmloQkWGGrs7mE2MLfBME64wfrsvLYfKjaX8a265IIBcuJdGakXW1hJKra0Ln8K3C55GtatTupWIiQcp--IZV6hDMzeYKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAAAHAAAAAAAAANYAAAAAAAAADiRTY2hlZHVsZWQtSW50ZXJ2YWwMMS1ob3VyIlNjaGVkdWxlZC1NZXNzYWdlXHsidGFncyI6W3sibmFtZSI6ImZ1bmN0aW9uIiwidmFsdWUiOiJoZWxsbyJ9XX0aRGF0YS1Qcm90b2NvbARhbw5hby10eXBlDnByb2Nlc3MYQ29udHJhY3QtU3JjVlY0Wl9vNzA0SUxrakZYNkR5OTN5Y29LZXJ5d2ZpcDk0ajA3ZFJqeE1DUHMYQ29udGVudC1UeXBlFHRleHQvcGxhaW4GU0RLBGFvADE3MDc";
    const SORT_KEY_STR: &str = "000001313225,1701394600190,abcdce17d0cc89ec0b9fd7f7170ba974b1285fc7163d66480cc9c83c8c8c14a2";

    #[test]
    fn test_message_from_bundle() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let mut data_bundle = DataBundle::new(SORT_KEY_STR.to_string());
        data_bundle.add_item(data_item);
        let message = Message::from_bundle(&data_bundle).expect("failed to create message");
        assert_eq!(message.message.id, "6oYAxVAnH8yKsZKpMgHSbRv7uVWey68PAqYuSXeZBbg".to_string());
        assert_eq!(message.owner.address, "4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck".to_string());
        assert_eq!(message.process_id, "-oM8CYgbqsRcpI3tE_cpGM3kgDlamnYjSGA4nptPao0".to_string());
        assert_eq!(message.block.clone().unwrap().height, 1313225);
        assert_eq!(message.block.clone().unwrap().timestamp, 1701394600190);
    }

    #[test]
    fn test_process_from_bundle() {
        let d_item_string = PROCESS_ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let mut data_bundle = DataBundle::new(SORT_KEY_STR.to_string());
        data_bundle.add_item(data_item);
        let process = Process::from_bundle(&data_bundle).expect("failed to create process");
        assert_eq!(process.owner.address, "4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck".to_string());
        assert_eq!(process.process_id, "boxXWZqkBaZmOKJ3Vh7PZzC07Q9OXmxF4QT_ikodfNY".to_string());
        assert_eq!(process.block.clone().unwrap().height, 1313225);
        assert_eq!(process.block.clone().unwrap().timestamp, 1701394600190);
    }
}