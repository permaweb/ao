use valid::{invalid_value, ConstraintViolation, State, Validate, Validation, ValidationError};
use crate::domain::validation::domain_config_schema::{FinalDomainConfigSchema, StartDomainConfigSchema};
use super::{domain_config_schema::{StartDomainConfigSchemaConstraint, StartDomainConfigSchemaState}, parse_schema::StartSchemaParser};

#[derive(Clone)]
#[allow(non_snake_case)]
struct StartServerConfigSchema {
    pub base: StartDomainConfigSchema,
    pub MODE: String,
    pub port: String,
    pub DUMP_PATH: String
}

impl StartSchemaParser<FinalServerConfigSchema> for StartServerConfigSchema {
    // todo: finish
    fn parse(&self) -> Result<FinalServerConfigSchema, ValidationError> {
        let mut final_server_config = FinalServerConfigSchema::default();
        let l = self.clone().validate(&ServerConfigState, &ServerConfigConstraint).result();
        let base = self.base.parse();
        match base {
            Ok(base) => final_server_config.base = base,
            Err(e) => return Err(e)
        }

        Ok(final_server_config)
    }
}

/**
 * The server config is an extension of the config required by the domain (business logic).
 * This prevents our domain from being aware of the environment it is running in ie.
 * An express server. Later, it could be anything
 */
#[allow(non_snake_case)]
#[allow(unused)]
struct FinalServerConfigSchema {
    pub base: FinalDomainConfigSchema,
    pub MODE: DevOrProd,
    pub port: u16,
    pub DUMP_PATH: String
}

impl Default for FinalServerConfigSchema {
    fn default() -> Self {
        FinalServerConfigSchema {
            base: FinalDomainConfigSchema::default(),
            MODE: DevOrProd::Development,
            port: 0,
            DUMP_PATH: "".to_string()
        }
    }
}

#[allow(unused)]
enum DevOrProd {
    Development,
    Production
}

struct ServerConfigConstraint;
struct ServerConfigState;
impl ServerConfigState {
    pub fn is_valid_mode(&self, val: &StartServerConfigSchema) -> bool {
        if val.MODE == "development".to_string() || val.MODE == "production".to_string() {
            return true;
        }
        false
    }

    pub fn is_valid_port(&self, val: &StartServerConfigSchema) -> bool {
        if val.port.parse::<u16>().is_ok() {
            return true;
        }
        false
    }

    pub fn is_valid_dump_path(&self, val: &StartServerConfigSchema) -> bool {
        if val.DUMP_PATH.len() > 0 {
            return true;
        }
        false
    }
}

impl<'a> Validate<ServerConfigConstraint, State<&'a ServerConfigState>> for StartServerConfigSchema {
    fn validate(self, context: impl Into<State<&'a ServerConfigState>>, _constraint: &ServerConfigConstraint) -> Validation<ServerConfigConstraint, Self> {
        let context: State<&'a ServerConfigState> = context.into();
        let mut violations: Vec<ConstraintViolation> = vec![];
        _ = self.base.clone().validate(&StartDomainConfigSchemaState, &StartDomainConfigSchemaConstraint).result()
            .err()
            .and_then(|mut e| {
               violations.append(&mut e.violations);
               Some(e)
            });
        if !context.is_valid_mode(&self) {
            violations.push(invalid_value("invalid-mode", "MODE", "".to_string(), "".to_string()));
        } 
        if !context.is_valid_port(&self) {
            violations.push(invalid_value("invalid-port", "port", "".to_string(), "".to_string()));
        } 
        if !context.is_valid_dump_path(&self) {
            violations.push(invalid_value("invalid-dump-path", "DUMP_PATH", "".to_string(), "".to_string()));
        }

        if violations.len() > 0 {
            return Validation::failure(violations);
        }
        Validation::success(self)             
    }
}