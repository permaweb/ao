package ante

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
)

type DeductFeeDecorator struct {
	standardDeductFeeDecorator ante.DeductFeeDecorator
}

func NewDeductFeeDecorator(standardDeductFeeDecorator ante.DeductFeeDecorator) DeductFeeDecorator {
	return DeductFeeDecorator{
		standardDeductFeeDecorator: standardDeductFeeDecorator,
	}
}

// The standard fee deduction only applies to transactions that do not have an Arweave DataItem
func (dfd DeductFeeDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (newCtx sdk.Context, err error) {
	if HasSingleDataItem(tx) {
		return next(ctx, tx, simulate)
	}
	return dfd.standardDeductFeeDecorator.AnteHandle(ctx, tx, simulate, next)
}
