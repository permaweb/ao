use super::WriteActionable;
use warp_contracts::js_imports::Transaction;
use warp_pst::{
    action::{Evolve, PstWriteResult},
    error::PstError::*,
    state::PstState,
};

impl WriteActionable for Evolve {
    fn action(self, _caller: String, mut state: PstState) -> PstWriteResult {
        match state.can_evolve {
            Some(true) => {
                if state.owner == Transaction::owner() {
                    state.evolve = Option::from(self.value);
                    PstWriteResult::Success(state)
                } else {
                    PstWriteResult::ContractError(OnlyOwnerCanEvolve)
                }
            }
            _ => PstWriteResult::ContractError(EvolveNotAllowed),
        }
    }
}
