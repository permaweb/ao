use lru::LruCache;
use std::{num::NonZeroUsize, sync::{Arc, RwLock}};
use lazy_static::lazy_static;

#[derive(Clone)]
pub struct LocalLruCache {
    internal_cache: Option<LruCache<String, UrlOwner>>,
    internal_size: usize
}

impl LocalLruCache {
    pub fn create_lru_cache(&mut self, size: usize) {
        if let Some(_) = self.internal_cache {
            return;
        }

        self.internal_size = size;
        self.internal_cache = Some(LruCache::new(NonZeroUsize::new(size).unwrap()));
    }

    /// Key can be process tx id or owner address
    pub fn get_by_key_with(&mut self, key: &str) -> Option<&UrlOwner> {
        if let None = self.internal_cache {
            return None;
        }
        self.internal_cache.as_mut().unwrap().get(key)
    }

    pub fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner) {
        if let None = self.internal_cache {
            return;
        }
        self.internal_cache.as_mut().unwrap().put(process_tx_id.to_string(), value);
    }    

    pub fn set_by_owner_with(&mut self, owner: &str, url: &str) {
        if let None = self.internal_cache {
            return;
        }
        self.internal_cache.as_mut().unwrap().put(owner.to_string(), UrlOwner { url: url.to_string(), address: owner.to_string() });
    }
}

impl Default for LocalLruCache {
    fn default() -> Self {
        LocalLruCache {
            internal_cache: None,
            internal_size: 0
        }
    }
}

#[derive(Clone, Debug)]
pub struct UrlOwner {
    pub url: String,
    /// Owner address
    pub address: String
}

lazy_static! {
    static ref CACHE: Arc<RwLock<LocalLruCache>> = {
        let mut cache = LocalLruCache::default();
        cache.create_lru_cache(10);

        Arc::new(RwLock::new(cache))
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    const PROCESS: &str = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";
    const SCHEDULER: &str = "gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w";
    const DOMAIN: &str = "https://foo.bar";
    const SIZE: usize = 10;

    #[test]
    fn test_get_by_process() {
        let mut cache = LocalLruCache::default();
        cache.create_lru_cache(SIZE);
        let internal_cache = cache.internal_cache.as_mut();
        internal_cache.unwrap().put(PROCESS.to_string(), UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() });

        let result = cache.get_by_key_with(PROCESS).unwrap();
        assert!(result.url == DOMAIN.to_string() && result.address == SCHEDULER.to_string());
    }

    #[test]
    fn test_get_by_owner() {
        let mut cache = LocalLruCache::default();
        cache.create_lru_cache(SIZE);
        let internal_cache = cache.internal_cache.as_mut();
        internal_cache.unwrap().put(SCHEDULER.to_string(), UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string()});

        let result = cache.get_by_key_with(SCHEDULER).unwrap();
        assert!(result.url == DOMAIN.to_string() && result.address == SCHEDULER.to_string());
    }

    #[test]
    fn test_set_by_process() {
        let mut cache = LocalLruCache::default();
        cache.create_lru_cache(SIZE);        

        cache.set_by_process_with(PROCESS, UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() });

        let internal_cache = cache.internal_cache.as_mut();
        assert!(internal_cache.unwrap().contains(PROCESS));
    }

    #[test]
    fn test_set_by_owner() {
        let mut cache = LocalLruCache::default();
        cache.create_lru_cache(SIZE);

        cache.set_by_owner_with(SCHEDULER, DOMAIN);

        let internal_cache = cache.internal_cache.as_mut();
        assert!(internal_cache.unwrap().contains(SCHEDULER));
    }
}