mod req {
    use schemars::JsonSchema;
    use serde::{Deserialize, Serialize};

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct Balance {
        pub target: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct KvPut {
        pub key: String,
        pub value: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct KvGet {
        pub key: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct Transfer {
        pub qty: u64,
        pub target: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct Evolve {
        pub value: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct ForeignRead {
        pub contract_tx_id: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct ForeignView {
        pub contract_tx_id: String,
        pub target: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct ForeignWrite {
        pub contract_tx_id: String,
        pub qty: u64,
        pub target: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq)]
    #[serde(rename_all = "camelCase", tag = "function")]
    pub enum Action {
        Balance(Balance),

        Transfer(Transfer),

        Evolve(Evolve),

        ForeignView(ForeignView),

        ForeignRead(ForeignRead),

        ForeignWrite(ForeignWrite),

        KvGet(KvGet),

        KvPut(KvPut),
    }
}

pub use req::*;

mod res {
    use schemars::JsonSchema;
    use serde::{Deserialize, Serialize};
    use strum_macros::EnumIter;

    use crate::{error::PstError, state::PstState};

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct PstBalanceResult {
        pub balance: u64,
        pub ticker: String,
        pub target: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct PstKvGetResult {
        pub key: String,
        pub value: String,
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Default)]
    #[serde(rename_all = "camelCase")]
    pub struct PstForeignViewResult {
        pub balance: u64,
        pub ticker: String,
        pub target: String,
    }

    #[derive(JsonSchema, Clone, PartialEq, Debug, Serialize, Deserialize, Hash, Eq, EnumIter)]
    #[serde(rename_all = "camelCase", tag = "function")]
    pub enum PstViewResponse {
        BalanceResult(PstBalanceResult),
        KvGetResult(PstKvGetResult),
        ForeignViewResult(PstForeignViewResult),
    }

    pub type PstViewResult =
        warp_contracts::handler_result::ViewResult<PstViewResponse, PstError>;
    pub type PstWriteResult =
        warp_contracts::handler_result::WriteResult<PstState, PstError>;
}

pub use res::*;

mod bindings {
    use schemars::JsonSchema;
    use serde::{Deserialize, Serialize};
    use strum_macros::EnumIter;

    use super::*;

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, EnumIter)]
    #[serde(rename_all = "camelCase", tag = "function")]
    pub enum View {
        Balance(Balance),
        BalanceResult(PstBalanceResult),
        ForeignView(ForeignView),
        ForeignViewResult(PstForeignViewResult),
        KvGet(KvGet),
        KvGetResult(PstKvGetResult),
    }

    #[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, Hash, PartialEq, Eq, EnumIter)]
    #[serde(rename_all = "camelCase", tag = "function")]
    pub enum WriteAction {
        Transfer(Transfer),

        Evolve(Evolve),

        ForeignRead(ForeignRead),

        ForeignWrite(ForeignWrite),

        KvPut(KvPut),
    }
}

pub use bindings::*;
