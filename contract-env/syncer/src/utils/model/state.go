package model

import "github.com/warp-contracts/syncer/src/utils/arweave"

const TableState = "sync_state"

type State struct {
	// Name of the synced component (interactions, contracts)
	Name SyncedComponent `gorm:"primaryKey" json:"name"`

	// Timestamp of the last fully processed transaction block
	FinishedBlockTimestamp uint64 `json:"finished_block_timestamp"`

	// Height of the last fully processed  transaction block
	FinishedBlockHeight uint64 `json:"finished_block_height"`

	// Hash of the last fully processed transaction block
	// Next block needs to have this hash set as its previous block hash
	FinishedBlockHash arweave.Base64String `json:"finished_block_hash"`
}

func (State) TableName() string {
	return TableState
}
