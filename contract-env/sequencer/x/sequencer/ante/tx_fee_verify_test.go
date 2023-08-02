package ante

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/cosmos/cosmos-sdk/client"
	sdk "github.com/cosmos/cosmos-sdk/types"
	txtypes "github.com/cosmos/cosmos-sdk/types/tx"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

func newTxBuilderWithDataItem(t *testing.T) (client.TxBuilder, *types.MsgDataItem) {
	dataItem := arweaveDataItem(t)
	txBuilder := newTxBuilder()
	err := txBuilder.SetMsgs(&dataItem)
	require.NoError(t, err)
	return txBuilder, &dataItem
}

var WARP_COIN = sdk.NewCoins(sdk.NewCoin("warptest", sdk.NewInt(1)))

func TestVerifyFeeTx(t *testing.T) {
	txBuilder, dataItem := newTxBuilderWithDataItem(t)
	tx := txBuilder.GetTx()

	err := verifyFee(tx, dataItem)

	require.NoError(t, err)
}

func TestVerifyFeeTxWithGas(t *testing.T) {
	txBuilder, dataItem := newTxBuilderWithDataItem(t)
	txBuilder.SetGasLimit(1)
	tx := txBuilder.GetTx()

	err := verifyFee(tx, dataItem)

	require.ErrorIs(t, err, types.ErrNonZeroGas)
}

func TestVerifyFeeTxWithFee(t *testing.T) {
	txBuilder, dataItem := newTxBuilderWithDataItem(t)
	txBuilder.SetFeeAmount(WARP_COIN)
	tx := txBuilder.GetTx()

	err := verifyFee(tx, dataItem)

	require.ErrorIs(t, err, types.ErrNonZeroFee)
}

func TestVerifyFeeTxWithFeePayer(t *testing.T) {
	feePayer, _ := sdk.AccAddressFromBech32("cosmos1ex86m6j6r48ee2ptwlmpmfws6ral6pxehv6508")
	txBuilder, dataItem := newTxBuilderWithDataItem(t)
	txBuilder.SetFeePayer(feePayer)
	tx := txBuilder.GetTx()

	err := verifyFee(tx, dataItem)

	require.ErrorIs(t, err, types.ErrNotEmptyFeePayer)
}

func TestVerifyFeeTxWithFeeGranter(t *testing.T) {
	tip := &txtypes.Tip{Tipper: "cosmos1xq823wxewwv6elykrn8savrx53f5s0cqt05kms", Amount: WARP_COIN}
	txBuilder, dataItem := newTxBuilderWithDataItem(t)
	txBuilder.SetTip(tip)
	tx := txBuilder.GetTx()

	err := verifyFee(tx, dataItem)

	require.ErrorIs(t, err, types.ErrNotEmptyTip)
}
