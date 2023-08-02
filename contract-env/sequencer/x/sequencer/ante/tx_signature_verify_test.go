package ante

import (
	"github.com/stretchr/testify/require"
	"testing"

	"cosmossdk.io/simapp"
	"github.com/cosmos/cosmos-sdk/testutil/testdata"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/types/tx/signing"
	authsigning "github.com/cosmos/cosmos-sdk/x/auth/signing"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"github.com/warp-contracts/sequencer/crypto/keys/arweave"
	"github.com/warp-contracts/sequencer/crypto/keys/ethereum"
	"github.com/warp-contracts/sequencer/x/sequencer/types"

	"github.com/warp-contracts/syncer/src/utils/bundlr"

	tmproto "github.com/cometbft/cometbft/proto/tendermint/types"
)

func appAndCtx(t *testing.T) (*simapp.SimApp, sdk.Context) {
	app := simapp.Setup(t, false)
	ctx := app.BaseApp.NewContext(false, tmproto.Header{})
	return app, ctx
}

func addCreatorAccount(t *testing.T, app *simapp.SimApp, ctx sdk.Context, dataItem types.MsgDataItem) authtypes.AccountI {
	acc := app.AccountKeeper.NewAccountWithAddress(ctx, dataItem.GetCreator())

	err := acc.SetSequence(5)
	require.NoError(t, err)

	app.AccountKeeper.SetAccount(ctx, acc)
	return acc
}

func createArweaveSignature(dataItem types.MsgDataItem, sequence uint64, data signing.SignatureData) signing.SignatureV2 {
	pubKey := arweave.FromOwner(dataItem.DataItem.Owner)
	return signing.SignatureV2{
		PubKey:   pubKey,
		Sequence: sequence,
		Data:     data,
	}
}

var singleSignatureData = &signing.SingleSignatureData{
	SignMode:  signing.SignMode_SIGN_MODE_DIRECT,
	Signature: nil,
}

func createEmptyArweaveSignature(dataItem types.MsgDataItem, sequence uint64) signing.SignatureV2 {
	return createArweaveSignature(dataItem, sequence, singleSignatureData)
}

func createEmptyEthereumSignature(t *testing.T, dataItem types.MsgDataItem, sequence uint64) signing.SignatureV2 {
	pubKey, err := ethereum.FromOwner(dataItem.DataItem.Owner)
	require.NoError(t, err)

	return signing.SignatureV2{
		PubKey:   pubKey,
		Sequence: sequence,
		Data:     singleSignatureData,
	}
}

func createTxWithSignatures(t *testing.T, dataItem types.MsgDataItem, signatures ...signing.SignatureV2) authsigning.Tx {
	txBuilder := newTxBuilder()

	err := txBuilder.SetMsgs(&dataItem)
	require.NoError(t, err)

	err = txBuilder.SetSignatures(signatures...)
	require.NoError(t, err)

	return txBuilder.GetTx()
}

func TestVerifySignaturesNoSignatures(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	addCreatorAccount(t, app, ctx, dataItem)
	tx := createTxWithSignatures(t, dataItem)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrNotSingleSignature)
}

func TestVerifySignaturesTooManySignatures(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sig := createEmptyArweaveSignature(dataItem, acc.GetSequence())
	tx := createTxWithSignatures(t, dataItem, sig, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrNotSingleSignature)
}

func TestVerifySignaturesInvalidSignMode(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sigData := &signing.SingleSignatureData{
		SignMode:  signing.SignMode_SIGN_MODE_UNSPECIFIED,
		Signature: nil,
	}
	sig := createArweaveSignature(dataItem, acc.GetSequence(), sigData)
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrInvalidSignMode)
}

func TestVerifySignaturesNotEmptySignature(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sigData := &signing.SingleSignatureData{
		SignMode:  signing.SignMode_SIGN_MODE_DIRECT,
		Signature: []byte("signature"),
	}
	sig := createArweaveSignature(dataItem, acc.GetSequence(), sigData)
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrNotEmptySignature)
}

func TestVerifySignaturesMultiSignature(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sigData := &signing.MultiSignatureData{}
	sig := createArweaveSignature(dataItem, acc.GetSequence(), sigData)
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrTooManySigners)
}

func TestVerifySignaturesPublicKeyMismatch(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	_, pubKey, _ := testdata.KeyTestPubAddr()
	sig := signing.SignatureV2{
		PubKey:   pubKey,
		Sequence: acc.GetSequence(),
		Data:     singleSignatureData,
	}
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrPublicKeyMismatch)
}

func TestVerifySignaturesWrongSequence(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sig := createEmptyArweaveSignature(dataItem, acc.GetSequence()+1)
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, sdkerrors.ErrWrongSequence)
}

func TestVerifySignaturesNoSequencerNonceTag(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t)
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sig := createEmptyArweaveSignature(dataItem, acc.GetSequence())
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrNoSequencerNonceTag)
}

func TestVerifySignaturesSequencerNonceMismatch(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t, bundlr.Tag{Name: "Sequencer-Nonce", Value: "1"})
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sig := createEmptyArweaveSignature(dataItem, acc.GetSequence())
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.ErrorIs(t, err, types.ErrSequencerNonceMismatch)
}

func TestVerifySignaturesArweaveSignature(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t, bundlr.Tag{Name: "Sequencer-Nonce", Value: "5"})
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sig := createEmptyArweaveSignature(dataItem, acc.GetSequence())
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.NoError(t, err)
}

func TestVerifySignaturesEthereumSignature(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := ethereumDataItem(t, bundlr.Tag{Name: "Sequencer-Nonce", Value: "5"})
	acc := addCreatorAccount(t, app, ctx, dataItem)
	sig := createEmptyEthereumSignature(t, dataItem, acc.GetSequence())
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.NoError(t, err)
}

func TestVerifySignaturesNoSignerAccount(t *testing.T) {
	app, ctx := appAndCtx(t)
	dataItem := arweaveDataItem(t, bundlr.Tag{Name: "Sequencer-Nonce", Value: "0"})
	sig := createEmptyArweaveSignature(dataItem, 0)
	tx := createTxWithSignatures(t, dataItem, sig)

	err := verifySignatures(ctx, app.AccountKeeper, tx, &dataItem)

	require.NoError(t, err)
}
