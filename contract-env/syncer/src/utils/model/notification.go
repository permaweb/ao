package model

import (
	"encoding/json"

	"github.com/warp-contracts/syncer/src/utils/arweave"

	"github.com/jackc/pgtype"
)

type ContractNotification struct {
	ContractTxId string        `json:"contractTxId"`
	Test         bool          `json:"test"`
	Source       string        `json:"source"`
	InitialState pgtype.JSONB  `json:"initialState"`
	Tags         []arweave.Tag `json:"tags"`
}

func (self *ContractNotification) MarshalBinary() (data []byte, err error) {
	return json.Marshal(self)
}

type InteractionNotification struct {
	ContractTxId string `json:"contractTxId"`
	Test         bool   `json:"test"`
	Source       string `json:"source"`
	Interaction  string `json:"interaction"`
}

func (self *InteractionNotification) MarshalBinary() (data []byte, err error) {
	return json.Marshal(self)
}

type AppSyncContractNotification struct {
	ContractTxId   string `json:"contractTxId"`
	Creator        string `json:"creator"`
	Type           string `json:"type"`
	BlockHeight    uint64 `json:"blockHeight"`
	BlockTimestamp uint64 `json:"blockTimestamp"`
	Source         string `json:"source"`
	SyncTimestamp  int64  `json:"syncTimestamp"`
}

func (self *AppSyncContractNotification) MarshalBinary() (data []byte, err error) {
	return json.Marshal(self)
}
