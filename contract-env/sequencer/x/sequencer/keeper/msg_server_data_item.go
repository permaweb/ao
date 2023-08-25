package keeper

import (
	"context"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

func (k msgServer) DataItem(goCtx context.Context, msg *types.MsgDataItem) (*types.MsgDataItemResponse, error) {
	return &types.MsgDataItemResponse{}, nil
}
