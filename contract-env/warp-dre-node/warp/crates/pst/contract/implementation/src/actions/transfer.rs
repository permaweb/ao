use super::WriteActionable;
use warp_contracts::js_imports::{log, SmartWeave, Transaction};
use warp_pst::{
    action::{PstWriteResult, Transfer},
    error::PstError::*,
    state::PstState,
};

impl WriteActionable for Transfer {
    fn action(self, _caller: String, mut state: PstState) -> PstWriteResult {
        log(("caller ".to_owned() + &SmartWeave::caller()).as_str());
        log(("Transaction owner ".to_owned() + &Transaction::owner()).as_str());

        if self.qty == 0 {
            return PstWriteResult::ContractError(TransferAmountMustBeHigherThanZero);
        }

        let caller = Transaction::owner();
        let balances = &mut state.balances;

        // Checking if caller has enough funds
        let caller_balance = *balances.get(&caller).unwrap_or(&0);
        if caller_balance < self.qty {
            return PstWriteResult::ContractError(CallerBalanceNotEnough(caller_balance));
        }

        // Update caller balance
        balances.insert(caller, caller_balance - self.qty);

        // Update target balance
        let target_balance = *balances.get(&self.target).unwrap_or(&0);
        balances.insert(self.target, target_balance + self.qty);

        PstWriteResult::Success(state)
    }
}
