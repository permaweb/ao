use std::fmt::Display;
use derive_more::Error;

#[derive(Error, Debug)]
pub struct InvalidSchedulerLocationError<'a> {
    pub name: &'a str,
    pub message: &'a str
}
impl<'a> InvalidSchedulerLocationError<'a> {
    pub fn new() -> Self {
        InvalidSchedulerLocationError {
            name: "InvalidSchedulerLocation",
            message: ""
        }
    }
}
impl<'a> Display for InvalidSchedulerLocationError<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "name: {}, message: {}", self.name, self.message)
    }
}

#[derive(Error, Debug)]
pub struct SchedulerTagNotFoundError {
    pub name: String,
    pub message: String
}
impl SchedulerTagNotFoundError {
    pub fn new() -> Self {
        SchedulerTagNotFoundError {
            name: "SchedulerTagNotFound".to_string(),
            message: "".to_string()
        }
    }
}
impl Display for SchedulerTagNotFoundError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "name: {}, message: {}", self.name, self.message)
    }
}

#[derive(Error, Debug)]
pub struct TransactionNotFoundError {
    pub name: String,
    pub message: String
}
impl TransactionNotFoundError {
    pub fn new() -> Self {
        TransactionNotFoundError {
            name: "TransactionNotFound".to_string(),
            message: "".to_string()
        }
    }
}
impl Display for TransactionNotFoundError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "name: {}, message: {}", self.name, self.message)
    }
}