use async_trait::async_trait;
use warp_pst::{action::{PstViewResult, PstWriteResult}, state::PstState};

pub mod balance;
pub mod evolve;
pub mod foreign_read;
pub mod foreign_view;
pub mod foreign_write;
pub mod kv_get;
pub mod kv_put;
pub mod transfer;
mod the_answer;

pub use balance::*;
pub use evolve::*;
pub use foreign_read::*;
pub use foreign_view::*;
pub use foreign_write::*;
pub use transfer::*;

pub trait ViewActionable {
    fn action(self, caller: String, state: &PstState) -> PstViewResult;
}

#[async_trait(?Send)]
pub trait AsyncViewActionable {
    async fn action(self, caller: String, state: &PstState) -> PstViewResult;
}

pub trait WriteActionable {
    fn action(self, caller: String, state: PstState) -> PstWriteResult;
}

#[async_trait(?Send)]
pub trait AsyncWriteActionable {
    async fn action(self, caller: String, state: PstState) -> PstWriteResult;
}
