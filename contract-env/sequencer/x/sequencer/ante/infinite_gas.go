package ante

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type SetInfiniteGasMeterDecorator struct{}

func NewSetInfiniteGasMeterDecorator() SetInfiniteGasMeterDecorator {
	return SetInfiniteGasMeterDecorator{}
}

// For transactions containing an Arweave DataItem we do not check gas consumption
func (sigmd SetInfiniteGasMeterDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (newCtx sdk.Context, err error) {
	if HasSingleDataItem(tx) {
		newCtx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	} else {
		newCtx = ctx
	}
	return next(newCtx, tx, simulate)
}
