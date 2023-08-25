package ante

import (
	"cosmossdk.io/errors"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

// Checking if a transaction containing a DataItem does not have the memo, timeout height, and extension options set.
func verifyTxBody(tx sdk.Tx) error {
	if err := verifyMemo(tx); err != nil {
		return err
	}

	if err := verifyTimeoutHeight(tx); err != nil {
		return err
	}

	if err := verifyExtOpts(tx); err != nil {
		return err
	}

	return nil
}

func verifyMemo(tx sdk.Tx) error {
	memoTx, ok := tx.(sdk.TxWithMemo)
	if !ok {
		return errors.Wrap(sdkerrors.ErrTxDecode, "transaction is not of type TxWithMemo")
	}

	if memoTx.GetMemo() != "" {
		return errors.Wrapf(types.ErrNotEmptyMemo,
			"transaction with data item cannot have non-empty memo: %s", memoTx.GetMemo())

	}

	return nil
}

func verifyTimeoutHeight(tx sdk.Tx) error {
	timeoutTx, ok := tx.(sdk.TxWithTimeoutHeight)
	if !ok {
		return errors.Wrap(sdkerrors.ErrTxDecode, "transaction is not of type TxWithTimeoutHeight")
	}

	if timeoutTx.GetTimeoutHeight() != 0 {
		return errors.Wrapf(types.ErrNonZeroTimeoutHeight,
			"transaction with data item cannot have non-zero timeout height: %d", timeoutTx.GetTimeoutHeight())
	}

	return nil
}

func verifyExtOpts(tx sdk.Tx) error {
	if extensionOptionsTx, ok := tx.(ante.HasExtensionOptionsTx); ok {
		if len(extensionOptionsTx.GetExtensionOptions()) > 0 || len(extensionOptionsTx.GetNonCriticalExtensionOptions()) > 0 {
			return errors.Wrap(types.ErrHasExtensionOptions, "transaction with data item cannot have extension options")
		}
	}

	return nil
}
