use std::time::Duration;
use async_trait::async_trait;
use moka::{future::Cache, Expiry};
use once_cell::sync::OnceCell;

/// moka is internally thread safe, but requires cache to be cloned
#[derive(Clone)]
#[allow(unused)]
pub struct LocalLruCache {
    internal_cache: Cache<String, (Expiration, UrlOwner)>,
    internal_size: u64
}

impl LocalLruCache {
    pub fn new(size: u64) -> Self {
        Self {
            internal_size: size,
            internal_cache: Cache::builder()
                .max_capacity(size)
                .expire_after(CacheExpiry)
                .build()
        }
    }    
}

/// ttl: milliseconds
#[async_trait]
pub trait Cacher {    
    /// Key can be process tx id or owner address
    async fn get_by_key_with(&mut self, key: &str) -> Option<UrlOwner>;
    async fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner, ttl: u64);
    async fn set_by_owner_with(&mut self, owner: &str, url: &str, ttl: u64);
}

#[async_trait]
impl Cacher for LocalLruCache {    
    async fn get_by_key_with(&mut self, key: &str) -> Option<UrlOwner> {
        let result = self.internal_cache.get(key).await;
        if let Some(result) = result {
            return Some(result.1);
        }
        None
    }
    
    async fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner, ttl: u64) {
        self.internal_cache.get_with(process_tx_id.to_string(), async {(
            get_expiration_from_ms(ttl), 
            value
        )}).await;
        //self.internal_cache.insert(process_tx_id.to_string(), value).await;
    }    

    async fn set_by_owner_with(&mut self, owner: &str, url: &str, ttl: u64) {
        self.internal_cache.get_with(owner.to_string(), async {(
            get_expiration_from_ms(ttl), 
            UrlOwner { url: url.to_string(), address: owner.to_string() }
        )}).await;
        //self.internal_cache.insert(owner.to_string(), UrlOwner { url: url.to_string(), address: owner.to_string() }).await;
    }
}

#[derive(Clone, Debug)]
pub struct UrlOwner {
    pub url: String,
    /// Owner address
    pub address: String
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Expiration {
    /// The value never expires.
    Never,
    OneSecond,
    FiveSeconds,
    TenSeconds,
}

impl Expiration {
    pub fn as_duration(&self) -> Option<Duration> {
        match self {
            Expiration::Never => None,
            Expiration::OneSecond => Some(Duration::from_secs(1)),
            Expiration::FiveSeconds => Some(Duration::from_secs(5)),
            Expiration::TenSeconds => Some(Duration::from_secs(10))
        }
    }
}

pub struct CacheExpiry;
impl Expiry<String, (Expiration, UrlOwner)> for CacheExpiry {
    fn expire_after_create(&self, _key: &String, value: &(Expiration, UrlOwner), _created_at: std::time::Instant) -> Option<Duration> {
        let duration = value.0.as_duration();
        duration
    }
}

static CACHE: OnceCell<LocalLruCache> = OnceCell::new();
pub fn get_cache() -> LocalLruCache {
    let cache = CACHE.get_or_init(|| {
        LocalLruCache::new(10)
    });
    cache.clone()
}

pub fn get_expiration_from_ms(ttl: u64) -> Expiration {
    if ttl == 0 {
        Expiration::Never
    } else if ttl / 1000 <= 1 { 
        Expiration::OneSecond 
    } else if ttl / 1000 <= 5 { 
        Expiration::FiveSeconds 
    } else { 
        Expiration::TenSeconds 
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PROCESS: &str = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";
    const SCHEDULER: &str = "gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w";
    const DOMAIN: &str = "https://foo.bar";
    const SIZE: u64 = 10;
    const TEN_MS: u64 = 10;

    #[tokio::test]
    async fn test_get_by_process() {
        let mut cache = LocalLruCache::new(SIZE);
        let internal_cache = cache.clone().internal_cache;
        internal_cache.insert(PROCESS.to_string(), (get_expiration_from_ms(TEN_MS), UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() })).await;

        let result = cache.get_by_key_with(PROCESS).await;
        assert!(result.clone().unwrap().url == DOMAIN.to_string() && result.unwrap().address == SCHEDULER.to_string());
    }

    #[tokio::test]
    async fn test_get_by_owner() {
        let mut cache = LocalLruCache::new(SIZE);
        let internal_cache = cache.clone().internal_cache;
        internal_cache.insert(SCHEDULER.to_string(), (get_expiration_from_ms(TEN_MS), UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() })).await;

        let result = cache.get_by_key_with(SCHEDULER).await;
        assert!(result.clone().unwrap().url == DOMAIN.to_string() && result.unwrap().address == SCHEDULER.to_string());
    }

    #[tokio::test]
    async fn test_set_by_process() {
        let cache = LocalLruCache::new(SIZE);    

        cache.clone().set_by_process_with(PROCESS, UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() }, TEN_MS).await;

        let internal_cache = cache.internal_cache;
        assert!(internal_cache.get(PROCESS).await.is_some());
    }

    #[tokio::test]
    async fn test_set_by_owner() {
        let cache = LocalLruCache::new(SIZE);

        cache.clone().set_by_owner_with(SCHEDULER, DOMAIN, TEN_MS).await;

        let internal_cache = cache.internal_cache;
        assert!(internal_cache.get(SCHEDULER).await.is_some());
    }
}