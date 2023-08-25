use super::AsyncViewActionable;
use async_trait::async_trait;
use serde::Serialize;
use warp_contracts::{foreign_call::view_foreign_contract_state, handler_result::ViewResult::*};
use warp_pst::{
    action::{
        ForeignView, PstBalanceResult, PstForeignViewResult, PstViewResponse::*, PstViewResult,
    },
    state::PstState,
};

#[derive(Serialize, Debug)]
struct BalanceInput {
    function: String,
    target: String,
}

#[async_trait(?Send)]
impl AsyncViewActionable for ForeignView {
    async fn action(self, _caller: String, _state: &PstState) -> PstViewResult {
        let foreign_contract_state = view_foreign_contract_state(
            &self.contract_tx_id,
            BalanceInput {
                target: self.target,
                function: "balance".to_string(),
            },
        )
        .await;
        match foreign_contract_state {
            Success(PstBalanceResult {
                balance,
                ticker,
                target,
            }) => Success(ForeignViewResult(PstForeignViewResult {
                balance,
                ticker,
                target,
            })),
            ContractError(e) => ContractError(e),
            RuntimeError(e) => RuntimeError(e),
        }
    }
}
