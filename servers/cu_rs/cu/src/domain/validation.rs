use valid::{invalid_value, FieldName, Validate, Validation};
use std::fmt::Display;

pub struct UrlConstraint {
    regex: regex::Regex
}

impl UrlConstraint {
    pub fn new() -> Self {
        UrlConstraint {
            regex: regex::Regex::new(r"(http://|https://)+").unwrap()
        }
    }

    pub fn is_url(&self, val: Option<String>) -> bool {        
        if val.is_some() && self.regex.is_match(val.unwrap().as_str()) {
            return true;
        }
        return false;
    }
}

impl Validate<UrlConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &UrlConstraint) -> valid::Validation<UrlConstraint, Self> {
        if constraint.is_url(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-url", context, self.clone(), "string with http or https".to_string())])
    }
}

pub enum DbMode {
    Remote,
    Embedded
}

impl Display for DbMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DbMode::Remote => write!(f, "remote"),
            DbMode::Embedded => write!(f, "embedded")
        }
    }
}

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

impl Validate<DbModeConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &DbModeConstraint) -> Validation<DbModeConstraint, Self> {
        if constraint.is_valid_mode(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-db-mode", context, self.clone(), "string must be remote or embedded".to_string())])
    }
}

pub struct IntegerConstraint; 

impl IntegerConstraint {
    pub fn is_integer(&self, val: Option<String>) -> bool {
        if val.is_some() {
            if let Ok(val) = val.unwrap().parse::<i64>() {
                return true;
            }
        }
        return false;
    }
}

impl Validate<IntegerConstraint, FieldName> for String {
    fn validate(self, context: impl Into<FieldName>, constraint: &IntegerConstraint) -> Validation<IntegerConstraint, Self> {
        if constraint.is_integer(Some(self.clone())) {
            return Validation::success(self);
        }
        Validation::failure(vec![invalid_value("invalid-integer", context, self.clone(), "value must be an integer".to_string())])
    }
}