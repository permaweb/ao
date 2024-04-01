use valid::ValidationError;

pub trait StartSchemaParser<T> {
    fn parse(&self) -> Result<T, ValidationError>;
}