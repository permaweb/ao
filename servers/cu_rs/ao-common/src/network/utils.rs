use reqwest::header::{HeaderMap, HeaderValue};

pub fn get_content_type_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.append("Content-Type", HeaderValue::from_str("application/json").unwrap());
    headers
}