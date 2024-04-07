use crate::{client::{gateway::{Gateway, GatewayMaker}, in_memory::{Cacher, LocalLruCache}}, err::SchedulerErrors};

/**
   * Return the `Scheduler-Location` record for the address
   * or None, if it cannot be found
   *
   * @param {string} address - the wallet address used by the Scheduler
   * @returns {{ url: string } | None >} whether the wallet address is Scheduler
   */
pub async fn raw_with<C: Cacher, G: GatewayMaker>(mut cache: LocalLruCache, gateway: Gateway, gateway_url: &str, address: &str) -> Result<Option<SchedulerLocation>, SchedulerErrors> {
    let result = cache.get_by_key_with(address).await;
    if let Some(result) = result {
        return Ok(Some(SchedulerLocation { url: result.url }))
    }

    match gateway.load_scheduler_with(gateway_url, address).await  {
        Ok(sched) => {
            cache.set_by_owner_with(address, &sched.url, sched.ttl).await;
            Ok(Some(SchedulerLocation { url: sched.url }))
        },
        Err(e) => {
            if let SchedulerErrors::InvalidSchedulerLocationError { name: _, message: _ } = e {
                return Ok(None);
            }
            Err(e)
        }
    }
}

#[allow(unused)]
pub struct SchedulerLocation {
    url: String
}

#[cfg(test)]
mod tests {
    use crate::client::in_memory::UrlOwner;
    use crate::client::gateway::SchedulerResult;

    use super::*;
    use async_trait::async_trait;

    const SCHEDULER: &str = "gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w";
    const DOMAIN: &str = "https://foo.bar";
    const TEN_MS: u64 = 10;

    struct MockCacheRawFound;
    #[async_trait]
    impl Cacher for MockCacheRawFound {
        async fn get_by_key_with(&mut self, key: &str) -> Option<UrlOwner> {
            assert!(key == SCHEDULER);
            None
        }    
        async fn set_by_process_with(&mut self, _process_tx_id: &str, _value: UrlOwner, _ttl: u64) { unimplemented!() }    
    
        async fn set_by_owner_with(&mut self, owner: &str, url: &str, ttl: u64) {
            assert!(owner == SCHEDULER);
            assert!(url == DOMAIN);
            assert!(ttl == TEN_MS);
        }
    }

    struct MockGatewayRawFound;
    #[async_trait]
    impl GatewayMaker for MockGatewayRawFound {
        async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
            unimplemented!()
        }
        async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
            assert!(scheduler_wallet_address == SCHEDULER);
            Ok(SchedulerResult {
                url: DOMAIN.to_string(), ttl: TEN_MS, owner: SCHEDULER.to_string()
            })
        }
    }
}