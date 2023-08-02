package sync

import (
	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/model"
)

type Payload struct {
	BlockHeight    uint64
	BlockHash      arweave.Base64String
	BlockTimestamp uint64
	Interactions   []*model.Interaction
}
