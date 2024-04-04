use valid::{ConstraintViolation, ValidationError};

pub trait StartSchemaParser<T> {
    fn parse(&self) -> Result<T, ValidationError>;
}

pub fn get_violation_issues(errors: ValidationError) -> Vec<ViolationIssue> {
    let mut issues: Vec<ViolationIssue> = vec![];

    for violation in errors.violations.iter() {
        match violation {
            ConstraintViolation::Field(invalid_val) => {
                issues.push(ViolationIssue {
                    code: invalid_val.code.to_string(),
                    path: invalid_val.field.name.to_string(),
                    message: format!{"{}", invalid_val.code.to_uppercase()}
                })
            },
            ConstraintViolation::Relation(invalid_rel) => {
                issues.push(ViolationIssue {
                    code: invalid_rel.code.to_string(),
                    path: format!("{}:{}", invalid_rel.field1, invalid_rel.field2),
                    message: format!("{}: {}:{}", invalid_rel.code.to_uppercase(), invalid_rel.field1, invalid_rel.field2)
                })
            },
            ConstraintViolation::State(invalid_state) => {
                issues.push(ViolationIssue {
                    code: invalid_state.code.to_string(),
                    path: "".to_string(),
                    message: format!("{}", invalid_state.code.to_uppercase())
                })
            }
        }
    }

    issues
}

#[allow(unused)]
pub struct ViolationIssue {
    code: String,
    /// bread crumb to field name, usually just field name
    path: String,
    message: String
}

#[allow(non_camel_case_types)]
pub enum ZodIssueCode {
    invalid_type,
    invalid_literal,    
}