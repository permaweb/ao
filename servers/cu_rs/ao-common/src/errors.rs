use std::error::Error;
use std::fmt::Display;

#[derive(Debug)]
pub enum QueryGatewayErrors {
    Network(Option<Box<dyn std::error::Error + 'static>>),    
    Serialization(Option<Box<dyn std::error::Error + 'static>>)
}

impl Error for QueryGatewayErrors {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Network(err) => {
                match err {
                    Some(err) => Some(err.as_ref()),
                    None => None
                }
            },
            Self::Serialization(err) => {
                match err {
                    Some(err) => Some(err.as_ref()),
                    None => None
                }
            }
        }
    }
}

impl Display for QueryGatewayErrors {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Network(_) => write!(f, "Network error has occurred"),
            Self::Serialization(_) => write!(f, "Serialization error has occurred")
        }
    }
}