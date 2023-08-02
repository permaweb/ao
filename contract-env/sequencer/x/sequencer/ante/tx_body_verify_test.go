package ante

import (
	"github.com/stretchr/testify/require"
	"testing"

	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/testutil/testdata"
	"github.com/cosmos/cosmos-sdk/types/module/testutil"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

func newExtOptionsTxBuilder() authtx.ExtensionOptionsTxBuilder {
	return testutil.MakeTestEncodingConfig().TxConfig.NewTxBuilder().(authtx.ExtensionOptionsTxBuilder)
}

func newAnyValue() *codectypes.Any {
	any, err := codectypes.NewAnyWithValue(testdata.NewTestMsg())
	if err != nil {
		panic(err)
	}
	return any
}

func TestVerifyTxBody(t *testing.T) {
	tx := newExtOptionsTxBuilder().GetTx()

	err := verifyTxBody(tx)

	require.NoError(t, err)
}

func TestVerifyTxBodyWithMemo(t *testing.T) {
	txBuilder := newExtOptionsTxBuilder()
	txBuilder.SetMemo("not empty memo")
	tx := txBuilder.GetTx()

	err := verifyTxBody(tx)

	require.ErrorIs(t, err, types.ErrNotEmptyMemo)
}

func TestVerifyTxBodyWithTimeoutHeight(t *testing.T) {
	txBuilder := newExtOptionsTxBuilder()
	txBuilder.SetTimeoutHeight(123)
	tx := txBuilder.GetTx()

	err := verifyTxBody(tx)

	require.ErrorIs(t, err, types.ErrNonZeroTimeoutHeight)
}

func TestVerifyTxBodyWithExtensionOptions(t *testing.T) {
	txBuilder := newExtOptionsTxBuilder()
	txBuilder.SetExtensionOptions(newAnyValue())
	tx := txBuilder.GetTx()

	err := verifyTxBody(tx)

	require.ErrorIs(t, err, types.ErrHasExtensionOptions)
}

func TestVerifyTxBodyWithNonCriticalExtensionOptions(t *testing.T) {
	txBuilder := newExtOptionsTxBuilder()
	txBuilder.SetNonCriticalExtensionOptions(newAnyValue())
	tx := txBuilder.GetTx()

	err := verifyTxBody(tx)

	require.ErrorIs(t, err, types.ErrHasExtensionOptions)
}
