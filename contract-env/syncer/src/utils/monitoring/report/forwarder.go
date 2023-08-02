package report

import (
	"go.uber.org/atomic"
)

type ForwarderErrors struct {
	DbLastTransactionBlockHeight atomic.Uint64 `json:"db_last_transaction_block_height"`
	DbFetchL1Interactions        atomic.Uint64 `json:"db_getch_l1_interactions"`
	DbFetchL2Interactions        atomic.Uint64 `json:"db_getch_l2_interactions"`
}

type ForwarderState struct {
	FinishedHeight      atomic.Uint64 `json:"finished_height"`
	L1Interactions      atomic.Uint64 `json:"l1_interactions"`
	L2Interactions      atomic.Uint64 `json:"l2_interactions"`
	CurrentSyncerHeight atomic.Uint64 `json:"current_syncer_height"`
	BlocksBehindSyncer  atomic.Uint64 `json:"blocks_behind_syncer"`
}

type ForwarderReport struct {
	State  ForwarderState  `json:"state"`
	Errors ForwarderErrors `json:"errors"`
}
