use crate::{client::{gateway::{GatewayMaker, SchedulerResult, DEFAULT_TTL}, in_memory::{Cacher, UrlOwner}, scheduler::CheckForRedirectFn}, err::SchedulerErrors};

/**
   * Locate the scheduler for the given process.
   *
   * Later on, this implementation could encompass the automatic swapping
   * of decentralized sequencers
   *
   * @param {string} process - the id of the process
   * @param {string} [schedulerHint] - the id of owner of the scheduler, which prevents having to query the process
   * from a gateway, and instead skips to querying Scheduler-Location
   * @returns { url: string, address: string } - an object whose url field is the Scheduler Location
   */
  pub async fn locate_with<C: Cacher, G: GatewayMaker, R: CheckForRedirectFn>(
    mut cache: C, 
    gateway: &G, 
    check_for_redirect: &R,
    gateway_url: &str,     
    process: &str, 
    scheduler_hint: Option<&str>, 
    follow_redirects: bool
  ) -> 
    Result<UrlOwner, SchedulerErrors> {      
      if let Some(cached) = cache.get_by_process_with(process).await { 
        return Ok(cached);
      }
      
      // If the scheduler hint was provided,
      // so skip querying the process and instead
      // query the Scheduler-Location record directly
      #[allow(unused)]
      let mut scheduler: Option<SchedulerResult> = None;   
      if scheduler_hint.is_some() {
        if let Some(by_owner) = cache.get_by_owner_with(scheduler_hint.unwrap()).await {
          println!("use cache");
          scheduler = Some(SchedulerResult { url: by_owner.url, ttl: DEFAULT_TTL, owner: by_owner.address });
        } else {
          match gateway.load_scheduler_with(gateway_url, scheduler_hint.unwrap()).await {
            Ok(sched) => {
              cache.set_by_owner_with(&sched.owner, &sched.url, sched.ttl).await;
              scheduler = Some(sched);
            },
            Err(e) => return Err(e)
          }
        }
      } else {
        match gateway.load_process_scheduler_with(gateway_url, process).await {
          Ok(sched) => scheduler = Some(sched),
          Err(e) => return Err(e)
        }
      }

      let scheduler = scheduler.unwrap();
      let mut final_url = scheduler.url.clone();
      println!("follow_redirects: {}", follow_redirects);
      if follow_redirects {        
        match check_for_redirect.check_for_redirect_with(&scheduler.url, process).await {
          Ok(url) => final_url = url,
          Err(e) => return Err(e)
        };
      }

      let by_process = UrlOwner { url: final_url, address: scheduler.owner };
      cache.set_by_process_with(process, by_process.clone(), scheduler.ttl).await;
      return Ok(by_process);
  }

  #[cfg(test)]
  mod tests {
    use async_trait::async_trait;
    use crate::client::gateway::SchedulerResult;
    use super::*;

    const PROCESS: &str = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";
    const SCHEDULER: &str = "gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w";
    const DOMAIN: &str = "https://foo.bar";
    const DOMAIN_REDIRECT: &str = "https://foo-redirect.bar";
    const TEN_MS: u64 = 10;
    
    struct MockGatewayLoadAndCacheIt;
    #[async_trait]
    impl GatewayMaker for MockGatewayLoadAndCacheIt {
      async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
        assert!(process_tx_id == PROCESS);
        Ok(SchedulerResult { url: DOMAIN.to_string(), ttl: TEN_MS, owner: SCHEDULER.to_string()})
      }
      async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, _scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
          Err(SchedulerErrors::new_invalid_scheduler_location("should not load the scheduler if no hint".to_string()))
      }
    }

    struct MockCacheLoadAndCacheIt;
    #[async_trait]
    impl Cacher for MockCacheLoadAndCacheIt {
      async fn get_by_process_with(&mut self, process: &str) -> Option<UrlOwner> {
        assert!(process == PROCESS);
        None
      }   
      async fn get_by_owner_with(&mut self, _owner: &str) -> Option<UrlOwner> {
        unimplemented!()
      }    
      async fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner, ttl: u64) { 
        assert!(process_tx_id == PROCESS);
        assert!(value.url == DOMAIN);
        assert!(value.address == SCHEDULER);
        assert!(ttl == TEN_MS);
      }    
      async fn set_by_owner_with(&mut self, owner: &str, url: &str, ttl: u64) {
          assert!(owner == SCHEDULER);
          assert!(url == DOMAIN);
          assert!(ttl == TEN_MS);
      }
    }

    struct MockCheckForRedirectLoadAndCacheIt;
    #[async_trait]
    impl CheckForRedirectFn for MockCheckForRedirectLoadAndCacheIt {
      async fn check_for_redirect_with(&self, _url: &str, _process: &str) -> Result<String, SchedulerErrors> {
        unimplemented!()
      }
    }

    #[tokio::test]
    async fn test_location_load_and_cache() {
      let result = locate_with(MockCacheLoadAndCacheIt, &MockGatewayLoadAndCacheIt, &MockCheckForRedirectLoadAndCacheIt, "", PROCESS, None, false).await;
      let result = result.unwrap();
      assert!(result.url == DOMAIN && result.address == SCHEDULER);
    }

    struct MockGatewayServeCachedValue;
    #[async_trait]
    impl GatewayMaker for MockGatewayServeCachedValue {
      async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
        Err(SchedulerErrors::new_invalid_scheduler_location("should never call on chain if in cache".to_string()))
      }
      async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, _scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
          Err(SchedulerErrors::new_invalid_scheduler_location("should not load the scheduler if no hint".to_string()))
      }
    }

    struct MockCacheServeCachedValue;
    #[async_trait]
    impl Cacher for MockCacheServeCachedValue {
      async fn get_by_process_with(&mut self, process: &str) -> Option<UrlOwner> {
        assert!(process == PROCESS);
        Some(UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() })
      }    
      async fn get_by_owner_with(&mut self, _owner: &str) -> Option<UrlOwner> {
        panic!("should not check cache by owner if cached by process");
      }    
      async fn set_by_process_with(&mut self, _process_tx_id: &str, _value: UrlOwner, _ttl: u64) { 
        panic!("should not set cache by process if cached by process");
      }    
      async fn set_by_owner_with(&mut self, _owner: &str, _url: &str, _ttl: u64) {
        panic!("should not set cache by owner if cached by process");
      }
    }

    struct MockCheckForRedirectServeCachedValue;
    #[async_trait]
    impl CheckForRedirectFn for MockCheckForRedirectServeCachedValue {
      async fn check_for_redirect_with(&self, _url: &str, _process: &str) -> Result<String, SchedulerErrors> {
        unimplemented!()
      }
    }

    #[tokio::test]
    async fn test_location_serve_cached_value() {
      let result = locate_with(MockCacheServeCachedValue, &MockGatewayServeCachedValue, &MockCheckForRedirectServeCachedValue, "", PROCESS, None, false).await;
      let result = result.unwrap();
      assert!(result.url == DOMAIN && result.address == SCHEDULER);
    }

    struct MockGatewayLoadRedirectedAndCacheIt;
    #[async_trait]
    impl GatewayMaker for MockGatewayLoadRedirectedAndCacheIt {
      async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
        assert!(process_tx_id == PROCESS);
        Ok(SchedulerResult { url: DOMAIN.to_string(), ttl: TEN_MS, owner: SCHEDULER.to_string()})
      }
      async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, _scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
          Err(SchedulerErrors::new_invalid_scheduler_location("should not load the scheduler if no hint".to_string()))
      }
    }

    struct MockCacheLoadRedirectedAndCacheIt;
    #[async_trait]
    impl Cacher for MockCacheLoadRedirectedAndCacheIt {
      async fn get_by_process_with(&mut self, process: &str) -> Option<UrlOwner> {
        assert!(process == PROCESS);
        None
      }    
      async fn get_by_owner_with(&mut self, _owner: &str) -> Option<UrlOwner> {
        unimplemented!()
      }    
      async fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner, ttl: u64) { 
        assert!(process_tx_id == PROCESS);
        assert!(value.url == DOMAIN_REDIRECT);
        assert!(value.address == SCHEDULER);
        assert!(ttl == TEN_MS);
      }    
      async fn set_by_owner_with(&mut self, owner: &str, url: &str, ttl: u64) {
        assert!(owner == SCHEDULER);
        assert!(url == DOMAIN);
        assert!(ttl == TEN_MS);
      }
    }

    struct MockCheckForRedirectLoadRedirectedAndCacheIt;
    #[async_trait]
    impl CheckForRedirectFn for MockCheckForRedirectLoadRedirectedAndCacheIt {
      async fn check_for_redirect_with(&self, url: &str, process: &str) -> Result<String, SchedulerErrors> {
        assert!(process == PROCESS);
        assert!(url == DOMAIN);
        Ok(DOMAIN_REDIRECT.to_string())
      }
    }

    #[tokio::test]
    async fn test_location_load_redirected_and_cache_it() {
      let result = locate_with(MockCacheLoadRedirectedAndCacheIt, &MockGatewayLoadRedirectedAndCacheIt, &MockCheckForRedirectLoadRedirectedAndCacheIt, "", PROCESS, None, true).await;
      let result = result.unwrap();
      assert!(result.url == DOMAIN_REDIRECT && result.address == SCHEDULER);
    }

    struct MockGatewayUseSchedulerHintAndSkipQueryingProcess;
    #[async_trait]
    impl GatewayMaker for MockGatewayUseSchedulerHintAndSkipQueryingProcess {
      async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
        panic!("should not load process if given a scheduler hint");
      }
      async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
          assert!(scheduler_wallet_address == SCHEDULER);
          Ok(SchedulerResult { url: DOMAIN.to_string(), ttl: TEN_MS, owner: SCHEDULER.to_string() })
      }
    }

    struct MockCacheUseSchedulerHintAndSkipQueryingProcess;
    #[async_trait]
    impl Cacher for MockCacheUseSchedulerHintAndSkipQueryingProcess {
      async fn get_by_process_with(&mut self, process: &str) -> Option<UrlOwner> {
        assert!(process == PROCESS);
        None
      }    
      async fn get_by_owner_with(&mut self, owner: &str) -> Option<UrlOwner> {
        assert!(owner == SCHEDULER);
        None
      }    
      async fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner, ttl: u64) { 
        assert!(process_tx_id == PROCESS);
        assert!(value.url == DOMAIN_REDIRECT);
        assert!(value.address == SCHEDULER);
        assert!(ttl == TEN_MS);
      }    
      async fn set_by_owner_with(&mut self, owner: &str, url: &str, ttl: u64) {
        assert!(owner == SCHEDULER);
        assert!(url == DOMAIN);
        assert!(ttl == TEN_MS);
      }
    }

    struct MockCheckForRedirectUseSchedulerHintAndSkipQueryingProcess;
    #[async_trait]
    impl CheckForRedirectFn for MockCheckForRedirectUseSchedulerHintAndSkipQueryingProcess {
      async fn check_for_redirect_with(&self, url: &str, process: &str) -> Result<String, SchedulerErrors> {
        assert!(process == PROCESS);
        assert!(url == DOMAIN);
        Ok(DOMAIN_REDIRECT.to_string())
      }
    }

    #[tokio::test]
    async fn test_location_use_scheduler_hint_and_skip_querying_process() {
      let result = locate_with(
        MockCacheUseSchedulerHintAndSkipQueryingProcess, 
        &MockGatewayUseSchedulerHintAndSkipQueryingProcess, 
        &MockCheckForRedirectUseSchedulerHintAndSkipQueryingProcess, 
        "", 
        PROCESS, 
        Some(SCHEDULER),
        true
      ).await;
      let result = result.unwrap();
      assert!(result.url == DOMAIN_REDIRECT && result.address == SCHEDULER);
    }

    struct MockGatewayUseSchedulerHintAndCachedOwner;
    #[async_trait]
    impl GatewayMaker for MockGatewayUseSchedulerHintAndCachedOwner {
      async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str, _process_tx_id: &'a str) -> Result<SchedulerResult, SchedulerErrors> {
        panic!("should not load process if given a scheduler hint");
      }
      async fn load_scheduler_with<'a>(&self, _gateway_url: &'a str, _scheduler_wallet_address: &'a str) -> Result<SchedulerResult, SchedulerErrors>  {
          panic!("should not load the scheduler if cached");
      }
    }

    struct MockCacheUseSchedulerHintAndCachedOwner;
    #[async_trait]
    impl Cacher for MockCacheUseSchedulerHintAndCachedOwner {
      async fn get_by_process_with(&mut self, process: &str) -> Option<UrlOwner> {
        assert!(process == PROCESS);
        None
      }    
      async fn get_by_owner_with(&mut self, owner: &str) -> Option<UrlOwner> {
        assert!(owner == SCHEDULER);
        Some(UrlOwner { url: DOMAIN.to_string(), address: SCHEDULER.to_string() })
      }    
      async fn set_by_process_with(&mut self, process_tx_id: &str, value: UrlOwner, ttl: u64) { 
        assert!(process_tx_id == PROCESS);
        assert!(value.url == DOMAIN_REDIRECT);
        assert!(value.address == SCHEDULER);
        assert!(ttl == TEN_MS);
      }    
      async fn set_by_owner_with(&mut self, _owner: &str, _url: &str, _ttl: u64) {
        panic!("should not cache by owner if cached");
      }
    }

    struct MockCheckForRedirectUseSchedulerHintAndCachedOwner;
    #[async_trait]
    impl CheckForRedirectFn for MockCheckForRedirectUseSchedulerHintAndCachedOwner {
      async fn check_for_redirect_with(&self, url: &str, process: &str) -> Result<String, SchedulerErrors> {
        assert!(process == PROCESS);
        assert!(url == DOMAIN);
        println!("runn");
        Ok(DOMAIN_REDIRECT.to_string())
      }
    }

    #[tokio::test]
    async fn test_location_use_scheduler_hint_and_cached_owner() {
      let result = locate_with(
        MockCacheUseSchedulerHintAndCachedOwner, 
        &MockGatewayUseSchedulerHintAndCachedOwner, 
        &MockCheckForRedirectUseSchedulerHintAndCachedOwner, 
        "", 
        PROCESS, 
        Some(SCHEDULER),
        true
      ).await;
      let result = result.unwrap();
      println!("result {:?}", result);
      println!("DOMAIN_REDIRECT {:?}", DOMAIN_REDIRECT);
      println!("SCHEDULER {:?}", SCHEDULER);
      assert!(result.url == DOMAIN_REDIRECT && result.address == SCHEDULER);
    }
  }