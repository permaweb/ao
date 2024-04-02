use std::borrow::Cow;
use valid::{invalid_value, invalid_optional_value, ConstraintViolation, FieldName, Validate, Validation, ValidationError};
use regex::Regex;
use super::shared_validation::{INVALID_EMPTY, INVALID_NOT_MATCH_UNDERSCORE, INVALID_NOT_MATCH_NUMBER};

pub fn parse_positive_int_schema(val: Option<String>, field_name: &str) -> Result<i64, ValidationError> {
    let validation = val.clone().validate(field_name.to_string(), &PositiveIntSchemaConstraint).result();
    if let Err(mut e) = validation {
        e.message = Some(Cow::from("Provided invalid value for positive_int_schema"));
        return Err(e);
    }

    if let None = val.clone() {
        return Ok(-1);
    }
    let regex = Regex::new(r"^(?!_)[0-9_]+(?!_)$").unwrap(); 
    if regex.is_match(val.clone().unwrap().as_str()) {
        let final_val = val.unwrap().replace("_", "");
        let final_val = final_val.parse::<i64>().unwrap();
        return Ok(final_val);
    } else if let Ok(val) = val.unwrap().parse::<i64>() {
        return Ok(val);
    }

    // just in case
    Err(ValidationError {
        message: Some(Cow::from("Provided invalid value for positive_int_schema")),
        violations: vec![]
    })
}

pub struct PositiveIntSchemaConstraint;

impl Validate<PositiveIntSchemaConstraint, FieldName> for Option<String> {
    fn validate(self, context: impl Into<FieldName>, _constraint: &PositiveIntSchemaConstraint) -> valid::Validation<PositiveIntSchemaConstraint, Self> {
        let regex = Regex::new(r"^(?!_)[0-9_]+(?!_)$").unwrap();
        
        let context: FieldName = context.into();
        let mut violations: Vec<ConstraintViolation> = vec![];
        if let None = self.clone() {
            violations.push(invalid_optional_value(INVALID_EMPTY, context.clone(), None, None));
        } 
        if !regex.is_match(self.clone().unwrap().as_str()) {
            violations.push(invalid_value(INVALID_NOT_MATCH_UNDERSCORE, context.clone(), self.clone().unwrap(), "expected number value".to_string()));
        } else if let Err(_e) = self.clone().unwrap().parse::<i64>() {
            violations.push(invalid_value(INVALID_NOT_MATCH_NUMBER, context, self.clone().unwrap(), "expected number value".to_string()));
        }

        if violations.len() > 0 {
            return Validation::failure(violations);
        } 
        Validation::success(self)
    }
}