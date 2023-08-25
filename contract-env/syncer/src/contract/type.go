package contract

import (
	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/model"
)

type ContractData struct {
	Contract *model.Contract
	Source   *model.ContractSource
}

type Payload struct {
	BlockHeight    uint64
	BlockTimestamp uint64
	BlockHash      arweave.Base64String
	Data           []*ContractData
}
