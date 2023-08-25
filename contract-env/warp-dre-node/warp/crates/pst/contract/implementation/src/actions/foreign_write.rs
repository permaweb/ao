use super::AsyncWriteActionable;
use async_trait::async_trait;
use serde::Serialize;
use warp_contracts::{foreign_call::write_foreign_contract, handler_result::WriteResult::*};
use warp_pst::{
    action::{ForeignWrite, PstWriteResult},
    error::PstError,
    state::PstState,
};

#[derive(Serialize)]
struct Input {
    function: String,
    qty: u64,
    target: String,
}

#[async_trait(?Send)]
impl AsyncWriteActionable for ForeignWrite {
    async fn action(self, _caller: String, state: PstState) -> PstWriteResult {
        match write_foreign_contract::<Input, PstError>(
            &self.contract_tx_id,
            Input {
                function: "transfer".to_string(),
                qty: self.qty,
                target: self.target,
            },
        )
        .await
        {
            Success(_) => Success(state),
            ContractError(e) => ContractError(e),
            RuntimeError(e) => RuntimeError(e),
        }
    }
}
