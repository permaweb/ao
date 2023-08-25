package keeper

import (
	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

var _ types.QueryServer = Keeper{}
