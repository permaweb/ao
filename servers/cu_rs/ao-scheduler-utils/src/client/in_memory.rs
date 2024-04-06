use lru::LruCache;
use std::num::NonZeroUsize;

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

    pub fn get_by_process_with(&mut self, process_tx_id: &str) -> Option<&UrlOwner> {
        if let None = self.internal_cache {
            return None;
        }
        self.internal_cache.as_mut().unwrap().get(process_tx_id)
    }

    pub fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner) {
        if let None = self.internal_cache {
            return;
        }
        self.internal_cache.as_mut().unwrap().put(process_tx_id.to_string(), value);
    }
}

#[derive(Clone, Debug)]
pub struct UrlOwner {
    pub url: String,
    /// Owner address
    pub address: String
}