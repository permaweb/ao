
use std::sync::Arc;

use super::dal::Gateway;

pub struct Verifier {
    gateway: Arc<dyn Gateway>
}

#[derive(Debug)]
pub enum VerifyErrorType {
    VerifyError(String),
}

impl From<reqwest::Error> for VerifyErrorType {
    fn from(error: reqwest::Error) -> Self {
        VerifyErrorType::VerifyError(format!("{:?}", error))
    }
}

impl From<String> for VerifyErrorType {
    fn from(error: String) -> Self {
        VerifyErrorType::VerifyError(error)
    }
}

impl Verifier {
    pub fn new(gateway: Arc<dyn Gateway>) -> Self {
        Verifier {
            gateway
        }
    }

    pub async fn verify_assignment(&self, message_id: &String, process_id: &String) -> Result<(), VerifyErrorType>{
        

        Ok(())
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::core::dal::NetworkInfo;
    use async_trait::async_trait;

    struct MockGateway;
    
    #[async_trait]
    impl Gateway for MockGateway {
        async fn check_head(&self, _tag_value: String) -> Result<bool, String> {
            Ok(true)
        }

        async fn network_info(&self) -> Result<NetworkInfo, String> {
            Ok(NetworkInfo {
                height: "height".to_string(),
                current: "current".to_string()
            })
        }
    }
    
    #[tokio::test]
    async fn test_verify() {
        let item_bytes = base64_url::decode(&"AQB9q2yhsQlBHv2LOTIrtmKjw063S1DG0prKcq86DykIegmPnXOReXkWXwpqXt4YxTRw6Rw1jG7f1QFF5ReoJO2MrJmia9ymkTmnhamv3lsYYIotBC6U4Bmzo6IZiKmn2llJt0MDvCe8rxzG15vvff9bpnDIVflY_Dm9Y0dCH-w2Xg8rb2xLq-cM8SBoNRiYruwcwpahiHTjXcxboJKksZRXaI_E7_7vL1gWlMLqeYeF_uXqkth8_PGtZcqMA7pbTYcRzGki_rifGXKUIZKgSIRXTk54iboiqNzOklIFpDKDJpC9Xk_6ppSw_Xzs8S0KpR-veBL8TeURtGhrsDecu_36Pk2MMvdZedxiAg7bvQ9H_NZecoZcju-sQKZiE7haq9Nos3g6njh9IpXivGJ1k8tRLeox7hXOeynffzcXz1Vnz5c4Zxw8LKUbLygni49sflKyFTMnQ8sgDw00fPsuhrznq37-2OLhmYe-tIg-TEV3T4VNdqchzeRSFIv_l7ZJcxeFxcEgdq9aXMx2yzVhSInFuk_W8fJSbhPKX9cewbr4BA_XUNMReowLVcnjB_19iCWnivkVk9sz-QRbjuVL2IMqZePWcRdN5ncXRJoYv4F-Z4FfXDCFuyCD4UAtiQfdch-S4KvRf99DwKrZrMIF28MDdRFdE3ZGDs3FXcPuN8eMLoKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAUAAAAAAAAASAAAAAAAAAAKGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3GkRhdGEtUHJvdG9jb2wEYW8OYW8tdHlwZQ5tZXNzYWdlBlNESwRhbwA2NTgz".to_string()).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let gateway = Arc::new(MockGateway);
        let verifier = Verifier::new(gateway);
        let result = verifier.verify_data_item(&data_item).await;
        assert!(result.is_ok(), "Verification failed");
    }

    #[tokio::test]
    async fn test_verify_with_attest() {
        // this data item contains an ao-load tag which isnt an actual tx
        // but works for the purposes of this test
        let item_bytes = base64_url::decode(&"AQBkY76kTNuBWFqOarur046vzChXoo34tYbUwFFlN4LzTvf6N5DrPy4vKXqIeg9cSe2rxK7MtChI2z8t8-Vp97jwLoOcXpErEsdlx2jHdB9xi38NsCuD_BEWD2jYFDI1F79yGIbLDgUJ-0U-LLV0lr1r52nzKtdY7Q9AfsKb6FNrUdYD27ybbSDDyg5ZnTNBA-Y_dXPjIvkhWQkwM_BEX_A2Q28t4etvL6czZS7sD6EY8TYjNxKva3XpP6hWuUVdnjlwnHbZn3E_1R4Xb7doL7cLEM7CcqCfo5tm5OYEwPXBtpEAZs528yCQsT295aKgdr7kA9blTWrB_MWlRNOpDYxXwo0iAtvwbZKuOwVtbMfFJMv1RN1itUHVcRcXIjtgutKZOkiLVT8_I8NCpzjSe-U-VsnxVYYng6H6EB7cYeRb9KHYGVp_ZVnnkoUAg6IAo7unJzbqnb3brMb5FiX9Ub0hY1eW47dqv9DH_Kft6nbBffKIB0TOhKQpKhdjGkg5STn6x03TeEL3RZLcw14b43gqrkoj_j8BVbAyry4F1UiHAovViZlYHR_opTRG0Fu_RKrVEgQxZjUXtlsT4QckNBJWTMB365l2Sz61wIRR0EV1cnL2REU-KEEGkmtRhEXW5sA3P_YDnv_P9SpcXviyAe0kLChCOYiRJmq9WQ8E90fKoIKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAYAAAAAAAAAYQAAAAAAAAAMGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3DmFvLWxvYWQgYXNkZmFzZGZhc2RmYXNkZhpEYXRhLVByb3RvY29sBGFvDmFvLXR5cGUObWVzc2FnZQZTREsEYW8ANDQzOA".to_string()).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let gateway = Arc::new(MockGateway);
        let verifier = Verifier::new(gateway);
        let result = verifier.verify_data_item(&data_item).await;
        assert!(result.is_ok(), "Verification failed");
    }

    struct MockGatewayFail;

    #[async_trait]
    impl Gateway for MockGatewayFail {
        async fn check_head(&self, _tag_value: String) -> Result<bool, String> {
            Ok(false)
        }

        async fn network_info(&self) -> Result<NetworkInfo, String> {
            Ok(NetworkInfo {
                height: "height".to_string(),
                current: "current".to_string()
            })
        }
    }

    #[tokio::test]
    async fn test_verify_with_attest_fail() {
        // this data item contains an ao-load tag which isn't an actual tx
        // but works for the purposes of this test
        let item_bytes = base64_url::decode(&"AQBkY76kTNuBWFqOarur046vzChXoo34tYbUwFFlN4LzTvf6N5DrPy4vKXqIeg9cSe2rxK7MtChI2z8t8-Vp97jwLoOcXpErEsdlx2jHdB9xi38NsCuD_BEWD2jYFDI1F79yGIbLDgUJ-0U-LLV0lr1r52nzKtdY7Q9AfsKb6FNrUdYD27ybbSDDyg5ZnTNBA-Y_dXPjIvkhWQkwM_BEX_A2Q28t4etvL6czZS7sD6EY8TYjNxKva3XpP6hWuUVdnjlwnHbZn3E_1R4Xb7doL7cLEM7CcqCfo5tm5OYEwPXBtpEAZs528yCQsT295aKgdr7kA9blTWrB_MWlRNOpDYxXwo0iAtvwbZKuOwVtbMfFJMv1RN1itUHVcRcXIjtgutKZOkiLVT8_I8NCpzjSe-U-VsnxVYYng6H6EB7cYeRb9KHYGVp_ZVnnkoUAg6IAo7unJzbqnb3brMb5FiX9Ub0hY1eW47dqv9DH_Kft6nbBffKIB0TOhKQpKhdjGkg5STn6x03TeEL3RZLcw14b43gqrkoj_j8BVbAyry4F1UiHAovViZlYHR_opTRG0Fu_RKrVEgQxZjUXtlsT4QckNBJWTMB365l2Sz61wIRR0EV1cnL2REU-KEEGkmtRhEXW5sA3P_YDnv_P9SpcXviyAe0kLChCOYiRJmq9WQ8E90fKoIKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAYAAAAAAAAAYQAAAAAAAAAMGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3DmFvLWxvYWQgYXNkZmFzZGZhc2RmYXNkZhpEYXRhLVByb3RvY29sBGFvDmFvLXR5cGUObWVzc2FnZQZTREsEYW8ANDQzOA".to_string()).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let gateway = Arc::new(MockGatewayFail);
        let verifier = Verifier::new(gateway);
        let result = verifier.verify_data_item(&data_item).await;
        assert!(result.is_err(), "Verification failed");
    }
}

