use std::clone::Clone;

use bundlr_sdk::{error::BundlrError, tags::*};

use sha2::{Digest, Sha256};
use base64_url;

#[derive(Debug)]
pub enum ByteErrorType {
    ByteError(String)
}

impl From<BundlrError> for ByteErrorType {
    fn from(error: BundlrError) -> Self {
        ByteErrorType::ByteError(format!("Byte error: {}", error))
    }
}

impl From<&str> for ByteErrorType {
    fn from(error: &str) -> Self {
        ByteErrorType::ByteError(format!("Byte error: {}", error.to_string()))
    }
}

#[derive(Clone)]
enum Data {
    None,
    Bytes(Vec<u8>)
}

#[derive(Clone)]
pub struct DataItem {
    signature_type: SignerMap,
    signature: Vec<u8>,
    owner: Vec<u8>,
    target: Vec<u8>,
    anchor: Vec<u8>,
    tags: Vec<Tag>,
    data: Data,
}

#[derive(Clone)]
pub struct Config {
    pub sig_length: usize,
    pub pub_length: usize,
    pub sig_name: String,
}

#[derive(PartialEq, Clone)]
pub enum SignerMap {
    None = -1,
    Arweave = 1,
}


impl SignerMap {
    pub fn get_config(&self) -> Config {
        Config {
            sig_length: 512,
            pub_length: 512,
            sig_name: "arweave".to_owned(),
        }
    }
}

impl SignerMap {
    pub fn as_u16(&self) -> u16 {
        match self {
            SignerMap::Arweave => 1,
            _ => u16::MAX,
        }
    }
}

impl From<u16> for SignerMap {
    fn from(t: u16) -> Self {
        match t {
            1 => SignerMap::Arweave,
            _ => SignerMap::None,
        }
    }
}


impl DataItem {
    fn from_info_bytes(buffer: &[u8]) -> Result<(Self, usize), ByteErrorType> {
        let sig_type_b = &buffer[0..2];
        let signature_type = u16::from_le_bytes(
            <[u8; 2]>::try_from(sig_type_b)
                .map_err(|err| ByteErrorType::ByteError(err.to_string()))?,
        );
        let signer = SignerMap::from(signature_type);
    
        let Config {
            pub_length,
            sig_length,
            ..
        } = signer.get_config();
    
        let signature = &buffer[2..2 + sig_length];
        let owner = &buffer[2 + sig_length..2 + sig_length + pub_length];
    
        let target_start = 2 + sig_length + pub_length;
        let target_present = u8::from_le_bytes(
            <[u8; 1]>::try_from(&buffer[target_start..target_start + 1])
                .map_err(|err| ByteErrorType::ByteError(format!("target bytes error - {}", err.to_string())))?,
        );
        let target = match target_present {
            0 => &[],
            1 => &buffer[target_start + 1..target_start + 33],
            _b => return Err(ByteErrorType::ByteError("target bytes error".to_string())),
        };
        let anchor_start = target_start + 1 + target.len();
        let anchor_present = u8::from_le_bytes(
            <[u8; 1]>::try_from(&buffer[anchor_start..anchor_start + 1])
                .map_err(|err| ByteErrorType::ByteError(format!("anchor bytes error - {}", err.to_string())))?,
        );
        let anchor = match anchor_present {
            0 => &[],
            1 => &buffer[anchor_start + 1..anchor_start + 33],
            b => return Err(ByteErrorType::ByteError(format!("anchor bytes error - {}", b.to_string()))),
        };
    
        let tags_start = anchor_start + 1 + anchor.len();
        let number_of_tags = u64::from_le_bytes(
            <[u8; 8]>::try_from(&buffer[tags_start..tags_start + 8])
                .map_err(|err| ByteErrorType::ByteError(format!("tag bytes error - {}", err.to_string())))?,
        );
    
        let number_of_tags_bytes = u64::from_le_bytes(
            <[u8; 8]>::try_from(&buffer[tags_start + 8..tags_start + 16])
                .map_err(|err| ByteErrorType::ByteError(format!("tag bytes error - {}", err.to_string())))?,
        );
    
        let mut b = buffer.to_vec();
        let mut tags_bytes =
            &mut b[tags_start + 16..tags_start + 16 + number_of_tags_bytes as usize];
    
        let tags = if number_of_tags_bytes > 0 {
            tags_bytes.decode()?
        } else {
            vec![]
        };
    
        if number_of_tags != tags.len() as u64 {
            return Err(ByteErrorType::ByteError("invalid tag encoding".to_string()));
        }
    
        let data_item = DataItem {
            signature_type: signer,
            signature: signature.to_vec(),
            owner: owner.to_vec(),
            target: target.to_vec(),
            anchor: anchor.to_vec(),
            tags,
            data: Data::None,
        };
    
        Ok((data_item, tags_start + 16 + number_of_tags_bytes as usize))
    }

    pub fn from_bytes(buffer: Vec<u8>) -> Result<Self, ByteErrorType> {
        let (bundlr_tx, data_start) = DataItem::from_info_bytes(&buffer)?;
        let data = &buffer[data_start..buffer.len()];

        Ok(DataItem {
            data: Data::Bytes(data.to_vec()),
            ..bundlr_tx
        })
    }

    pub fn raw_id(&self) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(&self.signature);
        hasher.finalize().to_vec()
    }

    pub fn id(&self) -> String {
        let raw_id = self.raw_id();
        base64_url::encode(&raw_id)
    }

    pub fn target(&self) -> String {
        let target_base64 = base64_url::encode(&self.target);
        target_base64
    }

    pub fn tags(&self) -> Vec<Tag> {
        self.tags.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ITEM_STR: &str = "AQB9q2yhsQlBHv2LOTIrtmKjw063S1DG0prKcq86DykIegmPnXOReXkWXwpqXt4YxTRw6Rw1jG7f1QFF5ReoJO2MrJmia9ymkTmnhamv3lsYYIotBC6U4Bmzo6IZiKmn2llJt0MDvCe8rxzG15vvff9bpnDIVflY_Dm9Y0dCH-w2Xg8rb2xLq-cM8SBoNRiYruwcwpahiHTjXcxboJKksZRXaI_E7_7vL1gWlMLqeYeF_uXqkth8_PGtZcqMA7pbTYcRzGki_rifGXKUIZKgSIRXTk54iboiqNzOklIFpDKDJpC9Xk_6ppSw_Xzs8S0KpR-veBL8TeURtGhrsDecu_36Pk2MMvdZedxiAg7bvQ9H_NZecoZcju-sQKZiE7haq9Nos3g6njh9IpXivGJ1k8tRLeox7hXOeynffzcXz1Vnz5c4Zxw8LKUbLygni49sflKyFTMnQ8sgDw00fPsuhrznq37-2OLhmYe-tIg-TEV3T4VNdqchzeRSFIv_l7ZJcxeFxcEgdq9aXMx2yzVhSInFuk_W8fJSbhPKX9cewbr4BA_XUNMReowLVcnjB_19iCWnivkVk9sz-QRbjuVL2IMqZePWcRdN5ncXRJoYv4F-Z4FfXDCFuyCD4UAtiQfdch-S4KvRf99DwKrZrMIF28MDdRFdE3ZGDs3FXcPuN8eMLoKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAUAAAAAAAAASAAAAAAAAAAKGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3GkRhdGEtUHJvdG9jb2wEYW8OYW8tdHlwZQ5tZXNzYWdlBlNESwRhbwA2NTgz";

    #[test]
    fn test_fields() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        assert_eq!("6oYAxVAnH8yKsZKpMgHSbRv7uVWey68PAqYuSXeZBbg".to_string(), data_item.id());
        assert_eq!("goGuTJ-Qzcnz1bUY2-twI0dI3OEXyg8i1ThCejv7HnZkg4CN90VxdNgtBhTtd-voYppEHJ6Y-uRuSsml0HxFBES3etBEM0ZFDSOds-frY9C6C-yz3wlmf0PhJw26xtuAoyKGPgyp9cTaa3sBv17DHl3TV34zB_cPqYbP8REEmAmjxvXX1tFd02-BQMkLnw0V3hyEQ5QXiZvKPalkH0_t_HbbIS9XvLoM3O4q-TTZhC3tPAvux3EfU9PrcJgnHS2VUYYO8mEYpRDA58NpccUyO65SVdr-SVMlPnARvvxoDKHfevDSf3Ck5qRMiTYqB6RskDNVYJPQF8uus6Eqzfnnr9377aYuZws442iwGNIuiS6-3KtM5ftu0pF_pmXmXfC3GwVo-A7ozdDL1RHjoC0rvpdIVB32RwN_9CPUXKuiclL96dAVZiflSb3uYOdhP1InAykMVL8VgFMqWw2GxXLXURbmQq6jqZNGV95slr0JC_43NtRqN3u6UBwzhU1Zi34ptuFVm1RRTGAO9cl2XBFJhHlTwnBLN7ex9q1vmZt2z4QBL61PuCvCu9NvjBHPbR70BG0GDqQL_HxC6MeYU5En3vOsWWee6c9uxaDBbPxt9P1EwXLnFQTUoMK2cmqn4zcWhbBBzixEQjIKXtDolOr-yU975fC30Lmiq6Ph79Kg65M".to_string(), data_item.owner());
        assert_eq!("-oM8CYgbqsRcpI3tE_cpGM3kgDlamnYjSGA4nptPao0".to_string(), data_item.target());
    }

    #[test]
    fn test_is_signed() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        assert_eq!(data_item.is_signed(), true);
    }
}