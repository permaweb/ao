package model

import (
	"database/sql"

	"github.com/jackc/pgtype"
	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/smartweave"

	"github.com/lib/pq"
)

const (
	TableInteraction = "interactions"
)

type Interaction struct {
	ID                 int `json:"id"`
	InteractionId      string
	Interaction        pgtype.JSONB `json:"interaction"`
	BlockHeight        int64
	BlockId            arweave.Base64String
	ContractId         string `json:"contractId"`
	Function           string
	Input              string
	ConfirmationStatus string
	InteractWrite      pq.StringArray `gorm:"type:text[]"`
	SortKey            string
	LastSortKey        pgtype.Text

	// Time when interaction was synced to te database
	SyncTimestamp pgtype.Int8

	// https://github.com/warp-contracts/gateway/blob/main/src/gateway/tasks/syncTransactions.ts#L175
	Evolve sql.NullString

	// https://github.com/warp-contracts/gateway/blob/ef7aad549045943f0127542cce36cd94a966bdc7/src/gateway/tasks/syncTransactions.ts#L187
	Testnet sql.NullString

	// Hardcoded arsyncer
	Source string

	// Wallet address, 44 characters
	Owner string

	// Those fields aren't used anymore, currenct version waits 10 blocks with the synchronization
	// ConfirmingPeer    string
	// ConfirmedAtHeight int64
	// Confirmations     string

	// Not needed:
	BundlerTxId string

	// LastSortKey       string
	BlockTimestamp int64
}

func (self *Interaction) GetInteraction() *smartweave.Interaction {

	return &smartweave.Interaction{}

}
