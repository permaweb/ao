use valid::{invalid_value, FieldName, Validate, Validation, ValidationError};

const DB_MAX_LISTENERS: &str = "DB_MAX_LISTENERS must be an integer";
pub fn parse_db_max_listeners_schema(val: Option<String>) -> Result<i64, ValidationError> {
    let result = val.validate("DB_MAX_LISTENERS", &IntegerConstraint).with_message(DB_MAX_LISTENERS);
    match result {
        Ok(val) => Ok(val.unwrap().unwrap().parse::<i64>().unwrap()),
        Err(e) => Err(e)
    }
}

pub struct IntegerConstraint; 

impl IntegerConstraint {
    pub fn is_integer(&self, val: Option<String>) -> bool {
        if val.is_some() {
            if let Ok(_val) = val.unwrap().parse::<i64>() {
                return true;
            }
        }
        return false;
    }
}

impl Validate<IntegerConstraint, FieldName> for Option<String> {
    fn validate(self, context: impl Into<FieldName>, constraint: &IntegerConstraint) -> Validation<IntegerConstraint, Self> {
        if constraint.is_integer(self.clone()) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-integer", context, if self.is_none() { "".to_string() } else { self.unwrap() }, "value must be an integer".to_string())])
    }
}