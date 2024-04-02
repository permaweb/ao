use valid::{invalid_value, FieldName, Validate, Validation, ValidationError};

pub const INVALID_NOT_TRUTHY: &str = "invalid-not-truthy";

pub fn parse_truthy_schema(val: Option<String>) -> Result<bool, ValidationError> {
    let result = val.validate("DISABLE_PROCESS_CHECKPOINT_CREATION", &TruthyConstraint).result();
    match result {
        Ok(_val) => Ok(true),
        Err(e) => Err(e)
    }
}

pub struct TruthyConstraint;

impl TruthyConstraint {
    pub fn is_truthy(&self, val: Option<String>) -> bool {
        if val.is_some() {
            let unwrapped_val = val.unwrap();
            let val_str = unwrapped_val.as_str();
            if val_str != "0"
                && val_str != ""
                && val_str != "false"
                && val_str != "null"
                && val_str != "undefined"
                && val_str != "NaN"
                {
                return true;
            }
        }
        return false;
    }
}

impl Validate<TruthyConstraint, FieldName> for Option<String> {
    fn validate(self, context: impl Into<FieldName>, constraint: &TruthyConstraint) -> Validation<TruthyConstraint, Self> {
        if constraint.is_truthy(self.clone()) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-truthy", context, if self.is_none() { "".to_string() } else { self.unwrap() }, "value must be js truthy".to_string())])
    }
}