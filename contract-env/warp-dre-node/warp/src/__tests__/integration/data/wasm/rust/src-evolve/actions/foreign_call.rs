use serde::{Deserialize, Serialize};

use crate::error::ContractError;
use crate::js_imports::{log, SmartWeave};
use crate::state::{HandlerResult, State};

#[derive(Serialize, Deserialize)]
pub struct JsAsyncResult {
    pub value: String,
}

pub async fn foreign_call(mut state: State, contract_tx_id: String) -> Result<HandlerResult, ContractError> {
    log(&format!("foreign_call: {}", contract_tx_id));
    if contract_tx_id == "bad_contract" {
        Err(ContractError::IDontLikeThisContract)
    } else {
        log("Before Async call");
        let foreign_contract_state: State = SmartWeave::read_contract_state(&contract_tx_id)
            .await.into_serde().unwrap();
        log(&format!("After Async call: {}", foreign_contract_state.ticker));

        // some dummy logic - just for the sake of the integration test
        if foreign_contract_state.ticker == "FOREIGN_PST" {
            for (_, val) in state.balances.iter_mut() {
                *val += 1000 ;
            }
        }

        Ok(HandlerResult::NewState(state))
    }
}
