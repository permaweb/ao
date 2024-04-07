use std::fmt::Display;

#[derive(Debug)]
pub enum SchedulerErrors {
    InvalidSchedulerLocationError {
        name: String,
        message: String
    },
    SchedulerTagNotFoundError {
        name: String,
        message: String
    },
    TransactionNotFoundError {
        name: String,
        message: String
    },
    Network(Option<Box<dyn std::error::Error + 'static + Send>>),    
    Serialization(Option<Box<dyn std::error::Error + 'static + Send>>),
    Url,
}

/// cause and description are deprecated
impl std::error::Error for SchedulerErrors {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidSchedulerLocationError { name: _, message: _ } => None,
            Self::SchedulerTagNotFoundError { name: _, message: _ } => None,
            Self::TransactionNotFoundError { name: _, message: _ } => None,
            Self::Network(err) => {
                match err {
                    Some(err) => Some(&*err.as_ref()),
                    None => None
                }
            },
            Self::Url => None,
            Self::Serialization(err) => {
                match err {
                    Some(err) => Some(&*err.as_ref()),
                    None => None
                }
            }
        }
    }        
}

impl SchedulerErrors {
    pub fn new_invalid_scheduler_location(message: String) -> Self {
        Self::InvalidSchedulerLocationError {
            name: "InvalidSchedulerLocation".to_string(),
            message
        }        
    }

    pub fn new_tag_not_found(message: String) -> Self {
        Self::SchedulerTagNotFoundError {
            name: "SchedulerTagNotFound".to_string(),
            message
        }        
    }

    pub fn new_transaction_not_found(message: String) -> Self {
        Self::TransactionNotFoundError {
            name: "TransactionNotFound".to_string(),
            message
        }
    }
}

impl Display for SchedulerErrors {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidSchedulerLocationError { name, message } => write!(f, "name: {}, message: {}", name, message),
            Self::SchedulerTagNotFoundError { name, message } => write!(f, "name: {}, message: {}", name, message),
            Self::TransactionNotFoundError { name, message } => write!(f, "name: {}, message: {}", name, message),
            Self::Network(_) => write!(f, "Network error has occurred"),
            Self::Serialization(_) => write!(f, "Serialization error has occurred"),
            Self::Url => write!(f, "Url is invalid")
        }        
    }
}
