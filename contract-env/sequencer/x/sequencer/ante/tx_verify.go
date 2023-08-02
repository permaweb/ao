package ante

import (
	"cosmossdk.io/errors"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

// Validation of a transaction containing a DataItem.
// Such a transaction can have exactly one message, and all the values in this transaction are predetermined or derived from the DataItem.
// See: https://github.com/warp-contracts/sequencer/issues/8
type DataItemTxDecorator struct {
	ak authkeeper.AccountKeeper
}

func NewDataItemTxDecorator(ak authkeeper.AccountKeeper) DataItemTxDecorator {
	return DataItemTxDecorator{
		ak: ak,
	}
}

func (ditd DataItemTxDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	dataItem, err := GetDataItemMsg(tx)
	if err != nil {
		return ctx, err
	}

	if dataItem != nil {
		if err := verifyTxWithDataItem(ctx, ditd.ak, tx, dataItem); err != nil {
			return ctx, err
		}
	}

	return next(ctx, tx, simulate)
}

func GetDataItemMsg(tx sdk.Tx) (*types.MsgDataItem, error) {
	msgs := tx.GetMsgs()

	for _, msg := range msgs {
		dataItem, isDataItem := msg.(*types.MsgDataItem)
		if isDataItem {
			if len(msgs) > 1 {
				err := errors.Wrapf(types.ErrTooManyMessages,
					"transaction with data item can have only one message, and it has: %d", len(msgs))
				return nil, err
			}
			return dataItem, nil
		}
	}

	return nil, nil
}

func HasSingleDataItem(tx sdk.Tx) bool {
	dataItem, err := GetDataItemMsg(tx)
	return dataItem != nil && err == nil
}

func verifyTxWithDataItem(ctx sdk.Context, ak authkeeper.AccountKeeper, tx sdk.Tx, dataItem *types.MsgDataItem) error {
	if err := verifyTxBody(tx); err != nil {
		return err
	}

	if err := verifySignatures(ctx, ak, tx, dataItem); err != nil {
		return err
	}

	if err := verifyFee(tx, dataItem); err != nil {
		return err
	}

	return nil
}
