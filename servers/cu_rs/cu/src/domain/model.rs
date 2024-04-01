use valid::ValidationError;
use once_cell::sync::OnceCell;
use super::validation::domain_config_schema::{FinalDomainConfigSchema, StartDomainConfigSchema};
use super::validation::parse_schema::StartSchemaParser;

pub static DOMAIN_CONFIG_SCHEMA: OnceCell<Result<FinalDomainConfigSchema, ValidationError>> = OnceCell::new();

pub fn domain_config_schema<'a>(start_schema: StartDomainConfigSchema) -> &'a Result<FinalDomainConfigSchema, ValidationError> {
    DOMAIN_CONFIG_SCHEMA.get_or_init(|| {
        start_schema.parse()
    })
}