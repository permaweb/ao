
/*
core is mostly pure, any side effects
should be injected via dal.rs traits
*/

mod bytes;
mod sequencer;
mod verifier;

// traits for injecting dependencies
pub mod dal;

// build json from raw data
pub mod json;

// main tx building logic
pub mod builder;