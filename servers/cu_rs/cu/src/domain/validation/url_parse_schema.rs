use valid::{invalid_value, FieldName, Validate, Validation, ValidationError};
use super::shared_validation::{option_validation_result, INVALID_URL};
use regex::Regex;

const URL_MESSAGE: &str = "URL must be a a valid URL";
pub fn parse_url_parse_schema(val: Option<String>, field_name: &str) -> Result<String, ValidationError> {
    option_validation_result(val.validate(field_name.to_string(), &UrlConstraint::new()).with_message(URL_MESSAGE))    
}

pub struct UrlConstraint {
    regex: Regex
}

impl UrlConstraint {
    pub fn new() -> Self {
        UrlConstraint {
            regex: Regex::new(r"(http://|https://)+").unwrap()
        }
    }

    pub fn is_url(&self, val: Option<String>) -> bool {        
        if val.is_some() && self.regex.is_match(val.unwrap().as_str()) {
            return true;
        }
        return false;
    }
}

impl Validate<UrlConstraint, FieldName> for Option<String> {
    fn validate(self, context: impl Into<FieldName>, constraint: &UrlConstraint) -> valid::Validation<UrlConstraint, Self> {
        if constraint.is_url(self.clone()) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value(INVALID_URL, context, if self.is_none() { "".to_string() } else { self.unwrap() }, "string with http or https".to_string())])
    }
}