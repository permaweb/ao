use valid::{invalid_value, FieldName, Validate, Validation, ValidationError};
use super::shared_validation::{option_validation_result, DbMode};

pub fn parse_db_mode_schema(val: Option<String>) -> Result<String, ValidationError> {    
    option_validation_result(val.validate("DB_MODE", &DbModeConstraint::new()).result())
}

#[allow(unused)]
pub struct DbModeConstraint {
    db_mode_remote: String,
    db_mode_embedded: String
}

impl DbModeConstraint {
    pub fn new() -> Self {
        DbModeConstraint {
            db_mode_remote: format!("{}", DbMode::Remote),
            db_mode_embedded: format!("{}", DbMode::Embedded)
        }
    }

    pub fn is_valid_mode(&self, val: Option<String>) -> bool {     
        if val.is_some() && self.db_mode_remote == val.unwrap() {
            return true;
        }
        return false;
    }
}

impl Validate<DbModeConstraint, FieldName> for Option<String> {
    fn validate(self, context: impl Into<FieldName>, constraint: &DbModeConstraint) -> Validation<DbModeConstraint, Self> {
        if constraint.is_valid_mode(self.clone()) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-db-mode", context, self.unwrap(), "string must be remote or embedded".to_string())])
    }
}