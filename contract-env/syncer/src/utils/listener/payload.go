package listener

import (
	"github.com/warp-contracts/syncer/src/utils/arweave"
)

type Payload struct {
	BlockHash      arweave.Base64String
	BlockHeight    int64
	BlockTimestamp int64
	Transactions   []*arweave.Transaction
}
