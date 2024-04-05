use super::validation::domain_config_schema::DomainConfigSchema;
use log::info;
use ao_common::arweave::InternalArweave;

#[allow(unused)]
pub struct DomainIndex {
    arweave: InternalArweave
}

impl DomainIndex {
    pub async fn create_api(_domain: DomainConfigSchema) {
        info!("Creating business logic apis");


    }
}