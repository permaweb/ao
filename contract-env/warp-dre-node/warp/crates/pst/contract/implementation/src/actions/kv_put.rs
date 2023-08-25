use super::AsyncWriteActionable;
use async_trait::async_trait;
use warp_contracts::{
    js_imports::{log, Transaction},
    kv_operations::kv_put,
};
use warp_pst::{
    action::{KvPut, PstWriteResult},
    state::PstState,
};

#[async_trait(?Send)]
impl AsyncWriteActionable for KvPut {
    async fn action(self, caller: String, state: PstState) -> PstWriteResult {
        let owner = Transaction::owner();
        log(&format!("caller {caller}"));
        log(&format!("Transaction owner {owner}"));

        match kv_put(&self.key, &self.value).await {
            Err(e) => PstWriteResult::RuntimeError(e),
            Ok(_) => PstWriteResult::Success(state),
        }
    }
}
