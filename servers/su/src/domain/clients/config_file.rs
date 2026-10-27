use std::time::{Duration, SystemTime};

use aws_config::default_provider::credentials::DefaultCredentialsChain;
use aws_credential_types::{provider::ProvideCredentials, Credentials};
use aws_sigv4::http_request::{
    sign, PayloadChecksumKind, PercentEncodingMode, SignableBody, SignableRequest, SigningSettings,
    UriPathNormalizationMode,
};
use aws_sigv4::sign::v4;
use reqwest::{Client, Request, Url};
use serde::de::DeserializeOwned;
use tokio::sync::OnceCell;

static CONFIG_CLIENT: OnceCell<ConfigFileClient> = OnceCell::const_new();

struct ConfigFileClient {
    http: Client,
    signed_http: Client,
    credentials: OnceCell<DefaultCredentialsChain>,
}

// Only AWS S3 REST endpoints may receive IAM credentials. Keep presigned URLs intact.
fn s3_region(url: &Url, fallback_region: &str) -> Option<String> {
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() {
        return None;
    }
    if url.query_pairs().any(|(key, _)| {
        matches!(
            key.to_ascii_lowercase().as_str(),
            "x-amz-signature" | "x-amz-algorithm" | "awsaccesskeyid" | "signature"
        )
    }) {
        return None;
    }
    let host = url.host_str()?;
    let host = host
        .strip_suffix(".amazonaws.com")
        .or_else(|| host.strip_suffix(".amazonaws.com.cn"))?;
    let endpoint = match host.rsplit_once(".s3") {
        Some((_, suffix)) => format!("s3{suffix}"),
        None => host.to_string(),
    };
    if endpoint == "s3" {
        return Some(fallback_region.to_string());
    }
    let region = endpoint
        .strip_prefix("s3.")
        .or_else(|| endpoint.strip_prefix("s3-"))?;
    let region = region.strip_prefix("dualstack.").unwrap_or(region);
    let parts: Vec<_> = region.split('-').collect();
    if parts.len() < 3
        || parts[0].len() != 2
        || !parts[..parts.len() - 1]
            .iter()
            .all(|part| !part.is_empty() && part.bytes().all(|c| c.is_ascii_lowercase()))
        || parts.last()?.is_empty()
        || !parts.last()?.bytes().all(|c| c.is_ascii_digit())
    {
        return None;
    }
    Some(region.to_string())
}

fn sign_request(
    request: &mut Request,
    region: &str,
    credentials: Credentials,
    time: SystemTime,
) -> Result<(), String> {
    let identity = credentials.into();
    let mut settings = SigningSettings::default();
    settings.percent_encoding_mode = PercentEncodingMode::Single;
    settings.uri_path_normalization_mode = UriPathNormalizationMode::Disabled;
    settings.payload_checksum_kind = PayloadChecksumKind::XAmzSha256;
    let params = v4::SigningParams::builder()
        .identity(&identity)
        .region(region)
        .name("s3")
        .time(time)
        .settings(settings)
        .build()
        .map_err(|_| "Failed to configure S3 request signing".to_string())?
        .into();
    let headers = request
        .headers()
        .iter()
        .map(|(name, value)| value.to_str().map(|value| (name.as_str(), value)))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Invalid S3 request header".to_string())?;
    let signable = SignableRequest::new(
        "GET",
        request.url().as_str(),
        headers.into_iter(),
        SignableBody::Bytes(&[]),
    )
    .map_err(|_| "Invalid S3 signing request".to_string())?;
    let (instructions, _) = sign(signable, &params)
        .map_err(|_| "Failed to sign S3 config request".to_string())?
        .into_parts();
    for (key, value) in instructions.headers() {
        let name = reqwest::header::HeaderName::from_bytes(key.as_bytes())
            .map_err(|_| "Invalid S3 signing header".to_string())?;
        let mut value = reqwest::header::HeaderValue::from_str(value)
            .map_err(|_| "Invalid S3 signing header".to_string())?;
        value.set_sensitive(true);
        request.headers_mut().insert(name, value);
    }
    Ok(())
}

pub async fn fetch_config<T: DeserializeOwned>(location: &str) -> Result<T, String> {
    let client = CONFIG_CLIENT
        .get_or_init(|| async {
            ConfigFileClient {
                http: Client::builder()
                    .timeout(Duration::from_secs(15))
                    .build()
                    .expect("Failed to create config HTTP client"),
                signed_http: Client::builder()
                    .redirect(reqwest::redirect::Policy::none())
                    .timeout(Duration::from_secs(15))
                    .build()
                    .expect("Failed to create S3 config HTTP client"),
                credentials: OnceCell::new(),
            }
        })
        .await;
    let url = Url::parse(location).map_err(|_| "Invalid config URL".to_string())?;
    let mut response = client
        .http
        .get(url.clone())
        .send()
        .await
        .map_err(|err| format!("Config request failed: {}", err.without_url()))?;
    let fallback_region = response
        .headers()
        .get("x-amz-bucket-region")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned)
        .or_else(|| std::env::var("AWS_REGION").ok())
        .or_else(|| std::env::var("AWS_DEFAULT_REGION").ok())
        .unwrap_or_else(|| "us-east-1".to_string());
    if response.status() == reqwest::StatusCode::FORBIDDEN {
        if let Some(region) = s3_region(&url, &fallback_region) {
            drop(response);
            let provider = client
                .credentials
                .get_or_init(|| async {
                    DefaultCredentialsChain::builder()
                        .region(aws_config::Region::new(region.clone()))
                        .build()
                        .await
                })
                .await;
            // Resolve through the provider on every refresh so expired role credentials are replaced.
            let credentials = provider
                .provide_credentials()
                .await
                .map_err(|_| "Unable to load AWS credentials for private S3 config".to_string())?;
            let mut request = client
                .signed_http
                .get(url)
                .build()
                .map_err(|_| "Failed to create S3 config request".to_string())?;
            sign_request(&mut request, &region, credentials, SystemTime::now())?;
            response = client
                .signed_http
                .execute(request)
                .await
                .map_err(|err| format!("S3 config request failed: {}", err.without_url()))?;
        }
    }
    if !response.status().is_success() {
        return Err(format!("Config request failed: HTTP {}", response.status()));
    }
    response
        .json()
        .await
        .map_err(|_| "Invalid config JSON".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, UNIX_EPOCH};

    #[test]
    fn recognizes_s3_rest_endpoints_and_their_regions() {
        for (location, expected) in [
            (
                "https://example-config-bucket.s3.us-west-1.amazonaws.com/allowed-ips.json",
                "us-west-1",
            ),
            ("https://bucket.s3.amazonaws.com/config.json", "us-east-1"),
            (
                "https://s3.us-west-1.amazonaws.com/bucket/config.json",
                "us-west-1",
            ),
            (
                "https://bucket.s3-us-west-1.amazonaws.com/config.json",
                "us-west-1",
            ),
            (
                "https://bucket.s3.dualstack.us-west-1.amazonaws.com/config.json",
                "us-west-1",
            ),
            (
                "https://bucket.s3.cn-north-1.amazonaws.com.cn/config.json",
                "cn-north-1",
            ),
            (
                "https://bucket.s3.us-gov-west-1.amazonaws.com/config.json",
                "us-gov-west-1",
            ),
        ] {
            assert_eq!(
                s3_region(&Url::parse(location).unwrap(), "us-east-1").as_deref(),
                Some(expected),
                "{location}"
            );
        }
        assert_eq!(
            s3_region(
                &Url::parse("https://s3.amazonaws.com/bucket/config.json").unwrap(),
                "eu-west-1"
            )
            .as_deref(),
            Some("eu-west-1")
        );
    }

    #[test]
    fn never_signs_public_http_custom_hosts_or_presigned_urls() {
        for location in [
            "http://bucket.s3.us-west-1.amazonaws.com/config.json",
            "http://config.internal/config.json",
            "https://example.com/config.json",
            "https://bucket.s3.us-west-1.amazonaws.com.evil.test/config.json",
            "https://bucket.s3-website-us-west-1.amazonaws.com/config.json",
            "https://user:password@bucket.s3.us-west-1.amazonaws.com/config.json",
            "https://bucket.s3.us-west-1.amazonaws.com/config.json?X-Amz-Signature=existing",
            "https://bucket.s3.us-west-1.amazonaws.com/config.json?AWSAccessKeyId=existing&Signature=existing",
        ] {
            assert_eq!(s3_region(&Url::parse(location).unwrap(), "us-east-1"), None, "{location}");
        }
    }

    #[test]
    fn matches_aws_published_s3_signature_example() {
        // https://docs.aws.amazon.com/AmazonS3/latest/userguide/sig-v4-header-based-auth.html
        let mut request = Client::new()
            .get("https://examplebucket.s3.amazonaws.com/test.txt")
            .header("range", "bytes=0-9")
            .build()
            .unwrap();
        let credentials = Credentials::new(
            "AKIAIOSFODNN7EXAMPLE",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            None,
            None,
            "test",
        );
        sign_request(
            &mut request,
            "us-east-1",
            credentials,
            UNIX_EPOCH + Duration::from_secs(1369353600),
        )
        .unwrap();
        assert_eq!(request.headers()["authorization"].to_str().unwrap(), "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
    }

    #[test]
    fn preserves_object_path_query_and_session_credentials() {
        let location = "https://bucket.s3.us-west-1.amazonaws.com/config%20file//ips.json?versionId=one%2Btwo&tag=a&tag=b";
        let mut request = Client::new().get(location).build().unwrap();
        let credentials = Credentials::new(
            "ROLEEXAMPLE",
            "example-secret",
            Some("example-session".to_string()),
            None,
            "test",
        );
        sign_request(
            &mut request,
            "us-west-1",
            credentials,
            UNIX_EPOCH + Duration::from_secs(1369353600),
        )
        .unwrap();
        assert_eq!(request.url().as_str(), location);
        assert_eq!(request.headers()["x-amz-security-token"], "example-session");
        assert!(request.headers()["authorization"]
            .to_str()
            .unwrap()
            .contains("/us-west-1/s3/aws4_request"));
        assert!(request.headers()["authorization"].is_sensitive());
        assert!(request.headers()["x-amz-security-token"].is_sensitive());
    }
}
