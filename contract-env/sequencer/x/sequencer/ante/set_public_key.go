package ante

import (
	"cosmossdk.io/errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	authsigning "github.com/cosmos/cosmos-sdk/x/auth/signing"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

type SetPubKeyDecorator struct {
	standardSetPubKeyDecorator ante.SetPubKeyDecorator
}

func NewSetPubKeyDecorator(standardSetPubKeyDecorator ante.SetPubKeyDecorator) SetPubKeyDecorator {
	return SetPubKeyDecorator{
		standardSetPubKeyDecorator: standardSetPubKeyDecorator,
	}
}

// For transactions containing an Arweave DataItem, an account with a set public key has already been created.
// In this case, we only emit events that are emitted in the standard SetPubKeyDecorator.
func (spkd SetPubKeyDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (newCtx sdk.Context, err error) {
	dataItem, err := GetDataItemMsg(tx)
	if err != nil {
		return ctx, err
	}

	if dataItem != nil {
		if err := emitEvents(ctx, tx, dataItem); err != nil {
			return ctx, err
		}

		return next(ctx, tx, simulate)
	}

	return spkd.standardSetPubKeyDecorator.AnteHandle(ctx, tx, simulate, next)
}

func emitEvents(ctx sdk.Context, tx sdk.Tx, dataItem *types.MsgDataItem) error {
	sigTx, ok := tx.(authsigning.SigVerifiableTx)
	if !ok {
		return errors.Wrap(sdkerrors.ErrTxDecode, "invalid tx type")
	}

	signers := sigTx.GetSigners()

	sigs, err := sigTx.GetSignaturesV2()
	if err != nil {
		return err
	}

	var events sdk.Events
	for i, sig := range sigs {
		events = append(events, sdk.NewEvent(sdk.EventTypeTx,
			sdk.NewAttribute(sdk.AttributeKeyAccountSequence, fmt.Sprintf("%s/%d", signers[i], sig.Sequence)),
		))

		events = append(events, sdk.NewEvent(sdk.EventTypeTx,
			sdk.NewAttribute(sdk.AttributeKeySignature, dataItem.DataItem.Signature.Base64()),
		))
	}

	ctx.EventManager().EmitEvents(events)
	return nil
}
