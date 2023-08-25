use super::{
    the_answer::{concatenate_the_answer, wrap_the_answer},
    AsyncViewActionable,
};
use async_trait::async_trait;
use warp_contracts::{handler_result::ViewResult::*, kv_operations::kv_get};
use warp_pst::{
    action::{KvGet, PstKvGetResult, PstViewResponse, PstViewResult},
    state::PstState,
};

#[async_trait(?Send)]
impl AsyncViewActionable for KvGet {
    async fn action(self, _caller: String, _state: &PstState) -> PstViewResult {
        // dummy logic to test plugins usage in rust.
        if self.key == "the_answer" {
            return PstViewResult::Success(PstViewResponse::KvGetResult(PstKvGetResult {
                key: self.key,
                value: concatenate_the_answer("the_answer_is_".to_string()),
            }));
        }
        if self.key == "the_answer_wrapped" {
            let the_answer = wrap_the_answer("context");
            return PstViewResult::Success(PstViewResponse::KvGetResult(PstKvGetResult {
                key: self.key,
                value: format!(
                    "the_answer_for_{}_is_{}",
                    the_answer.context, the_answer.answer
                ),
            }));
        }
        match kv_get(&self.key).await {
            Success(a) => PstViewResult::Success(PstViewResponse::KvGetResult(PstKvGetResult {
                key: self.key,
                value: a,
            })),
            ContractError(_) => {
                PstViewResult::Success(PstViewResponse::KvGetResult(PstKvGetResult {
                    key: self.key,
                    value: "".to_owned(),
                }))
            }
            RuntimeError(e) => RuntimeError(e),
        }
    }
}
