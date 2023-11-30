
/*
core is mostly pure and unit testable any
side effects should be injected via dal.rs
*/

mod bytes;
mod sequencer;
mod verifier;

pub mod dal;
pub mod json;
pub mod builder;