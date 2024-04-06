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

#[derive(Debug)]
pub enum SchedulerError {
    Network(Option<Box<dyn std::error::Error + 'static>>),    
    Serialization(Option<Box<dyn std::error::Error + 'static>>),
    Url,
}

impl Display for SchedulerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Network(_) => write!(f, "Network error has occurred"),
            Self::Serialization(_) => write!(f, "Serialization error has occurred"),
            Self::Url => write!(f, "Url is invalid")
        }
    }
}

/// cause and description are deprecated
impl std::error::Error for SchedulerError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Network(err) => {
                match err {
                    Some(err) => Some(err.as_ref()),
                    None => None
                }
            },
            Self::Url => None,
            Self::Serialization(err) => {
                match err {
                    Some(err) => Some(err.as_ref()),
                    None => None
                }
            }
        }
    }        
}