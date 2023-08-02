package report

import (
	"go.uber.org/atomic"
)

type ContractorErrors struct {
	DbContractInsert             atomic.Uint64 `json:"db_contract_interaction"`
	DbSourceInsert               atomic.Uint64 `json:"db_source_interaction"`
	DbLastTransactionBlockHeight atomic.Uint64 `json:"db_last_tx_block_height"`
	LoadPersistentContract       atomic.Uint64 `json:"load_persistent_contract"`
	LoadContract                 atomic.Uint64 `json:"load_contract"`
	LoadSource                   atomic.Uint64 `json:"load_source"`
	LoadInitState                atomic.Uint64 `json:"load_init_state"`
}

type ContractorState struct {
	FinishedHeight atomic.Uint64 `json:"finished_height"`

	AverageContractsSavedPerMinute atomic.Float64 `json:"average_contracts_saved_per_minute"`
	ContractsSaved                 atomic.Uint64  `json:"contracts_saved"`
}

type ContractorReport struct {
	State  ContractorState  `json:"state"`
	Errors ContractorErrors `json:"errors"`
}
