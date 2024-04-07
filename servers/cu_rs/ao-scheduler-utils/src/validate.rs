use crate::{client::{gateway::GatewayMaker, in_memory::Cacher}, err::SchedulerErrors};

pub async fn validate_with<C: Cacher, G: GatewayMaker>(mut cache: C, gateway: &G, gateway_url: &str, address: &str) -> Result<bool, SchedulerErrors> {
    let cached = cache.get_by_key_with(address).await;
    if let Some(_) = cached {
        return Ok(true);
    }
  
    match gateway.load_scheduler_with(gateway_url, address).await {
        Ok(sched) => {
            cache.set_by_owner_with(address, &sched.url).await;
            return Ok(true);
        },
        Err(e) => {
            if let SchedulerErrors::InvalidSchedulerLocationError { name: _, message: _ } = e {
                return Ok(false);
            }
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::client::{gateway::SchedulerResult, in_memory::UrlOwner};
    use super::*;
    use async_trait::async_trait;

    const SCHEDULER: &str = "gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w";
    const DOMAIN: &str = "https://foo.bar";
    const TEN_MS: &str = "10";

    pub struct MockLruCacheForIsValid;
    #[async_trait]
    impl Cacher for MockLruCacheForIsValid {
        /// Key can be process tx id or owner address
        async fn get_by_key_with(&mut self, key: &str) -> Option<UrlOwner> {
            assert!(key == SCHEDULER);
            None
        }    
        async fn set_by_process_with(&mut self, _process_tx_id: &str, _value: UrlOwner) { unimplemented!() }    
    
        async fn set_by_owner_with(&mut self, owner: &str, url: &str) {
            assert!(owner == SCHEDULER);
            assert!(url == DOMAIN);
        }
    }
    pub struct MockGatewayForIsValid;
    #[async_trait]
    impl GatewayMaker for MockGatewayForIsValid {
        async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
            unimplemented!()
        }
        async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
            assert!(scheduler_wallet_address == SCHEDULER);
            Ok(SchedulerResult {
                url: DOMAIN.to_string(), ttl: TEN_MS.to_string(), owner: SCHEDULER.to_string()
            })
        }
    }

    #[tokio::test]
    async fn test_validate_with_is_valid() {
        let result = validate_with(MockLruCacheForIsValid, &MockGatewayForIsValid, "", SCHEDULER).await;
        assert!(result.is_ok());
    }

    pub struct MockGatewayForIsNotValid;
    #[async_trait]
    impl GatewayMaker for MockGatewayForIsNotValid {
        async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
            unimplemented!()
        }
        async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
            assert!(scheduler_wallet_address == SCHEDULER);
            Err(SchedulerErrors::new_invalid_scheduler_location("Big womp".to_string()))
        }
    }

    #[tokio::test]
    async fn test_validate_with_is_not_valid() {
        let result = validate_with(MockLruCacheForIsValid, &MockGatewayForIsNotValid, "", SCHEDULER).await;
        assert!(result.ok().unwrap() == false);
    }

    pub struct MockLruCacheForIsFromCache;
    #[async_trait]
    impl Cacher for MockLruCacheForIsFromCache {
        /// Key can be process tx id or owner address
        async fn get_by_key_with(&mut self, key: &str) -> Option<UrlOwner> {
            assert!(key == SCHEDULER);
            Some(UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() })
        }
        async fn set_by_process_with(&mut self, _process_tx_id: &str, _value: UrlOwner) { unimplemented!() }    
    
        async fn set_by_owner_with(&mut self, _owner: &str, _url: &str) {
            unimplemented!()
        }
    }
    pub struct MockGatewayForIsFromCache;
    #[async_trait]
    impl GatewayMaker for MockGatewayForIsFromCache {
        async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
            unimplemented!()
        }
        async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, _scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
            panic!("should never call on chain if in cache")
        }
    }

    #[tokio::test]
    async fn test_validate_with_is_from_cache() {
        let result = validate_with(MockLruCacheForIsFromCache, &MockGatewayForIsFromCache, "", SCHEDULER).await;
        assert!(result.ok().unwrap() == true);
    }
}