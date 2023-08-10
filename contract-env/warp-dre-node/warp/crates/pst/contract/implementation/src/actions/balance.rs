use super::{the_answer::*, ViewActionable};
use warp_pst::{
    action::{Balance, PstBalanceResult, PstViewResponse::BalanceResult, PstViewResult},
    error::PstError::*,
    state::PstState,
};

impl ViewActionable for Balance {
    fn action(self, _caller: String, state: &PstState) -> PstViewResult {
        if self.target == "the_answer" {
            return PstViewResult::Success(BalanceResult(PstBalanceResult {
                balance: the_answer() as u64,
                ticker: state.ticker.clone(),
                target: self.target,
            }));
        }
        if self.target == "double_the_answer" {
            return PstViewResult::Success(BalanceResult(PstBalanceResult {
                balance: multiply_the_answer(2) as u64,
                ticker: state.ticker.clone(),
                target: self.target,
            }));
        }
        if !state.balances.contains_key(&self.target) {
            return PstViewResult::ContractError(WalletHasNoBalanceDefined(self.target));
        }
        let balance_response = PstBalanceResult {
            balance: *state.balances.get(&self.target).unwrap(),
            ticker: state.ticker.clone(),
            target: self.target,
        };
        PstViewResult::Success(BalanceResult(balance_response))
    }
}
