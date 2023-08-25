use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", tag = "function")]
pub enum Action {
    Transfer {
        qty: u64,
        target: String,
    },
    Balance {
        target: String
    },
    Evolve {
        value: String
    },
    ForeignCall {
        contract_tx_id: String
    }
}
