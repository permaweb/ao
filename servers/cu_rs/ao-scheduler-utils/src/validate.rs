use crate::{client::{gateway::get_gateway, in_memory::LocalLruCache}, err::SchedulerErrors};

pub async fn validate_with(gateway_url: &str, cache: &mut LocalLruCache, address: &str) -> Result<bool, SchedulerErrors> {
    let cached = cache.get_by_key_with(address);
    if let Some(_) = cached {
        return Ok(true);
    }

    let gateway = get_gateway("");    
    match gateway.load_scheduler_with(gateway_url, address).await {
        Ok(sched) => {
            cache.set_by_owner_with(address, &sched.url);
            return Ok(true);
        },
        Err(e) => {
            return Err(e);
        }
    }
}