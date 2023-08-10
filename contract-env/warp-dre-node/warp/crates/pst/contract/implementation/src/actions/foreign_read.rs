use super::AsyncWriteActionable;
use async_trait::async_trait;
use warp_contracts::{foreign_call::read_foreign_contract_state, js_imports::log};
use warp_pst::{
    action::{ForeignRead, PstWriteResult},
    error::PstError::*,
    state::PstState,
};

#[async_trait(?Send)]
impl AsyncWriteActionable for ForeignRead {
    async fn action(self, _caller: String, mut state: PstState) -> PstWriteResult {
        if self.contract_tx_id == "bad_contract" {
            return PstWriteResult::ContractError(IDontLikeThisContract);
        }
        let foreign_contract_state: PstState =
            match read_foreign_contract_state(&self.contract_tx_id).await {
                Ok(s) => s,
                Err(e) => return PstWriteResult::RuntimeError(e),
            };
        // Some dummy logic - just for the sake of the integration test
        if foreign_contract_state.ticker == "FOREIGN_PST" {
            log("Adding to tokens");
            for val in state.balances.values_mut() {
                *val += 1000;
            }
        }

        PstWriteResult::Success(state)
    }
}
