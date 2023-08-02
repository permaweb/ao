package ante

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/cosmos/cosmos-sdk/testutil/testdata"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authsigning "github.com/cosmos/cosmos-sdk/x/auth/signing"

	"github.com/warp-contracts/sequencer/x/sequencer/types"
)

func createTxWithMsgs(t *testing.T, msgs ...sdk.Msg) authsigning.Tx {
	txBuilder := newTxBuilder()

	err := txBuilder.SetMsgs(msgs...)
	require.NoError(t, err)

	return txBuilder.GetTx()
}

func TestGetDataItemMsgOneDataItem(t *testing.T) {
	dataItem := arweaveDataItem(t)
	tx := createTxWithMsgs(t, &dataItem)

	result, err := GetDataItemMsg(tx)

	require.NoError(t, err)
	require.Equal(t, &dataItem, result)
}

func TestGetDataItemMsgNoMsgs(t *testing.T) {
	tx := createTxWithMsgs(t)

	result, err := GetDataItemMsg(tx)

	require.Nil(t, err)
	require.Nil(t, result)
}

func TestGetDataItemMsgTooManyDataItems(t *testing.T) {
	dataItem := arweaveDataItem(t)
	tx := createTxWithMsgs(t, &dataItem, &dataItem)

	result, err := GetDataItemMsg(tx)

	require.Nil(t, result)
	require.ErrorIs(t, err, types.ErrTooManyMessages)
}

func TestGetDataItemMsgDataItemBeforeMsg(t *testing.T) {
	dataItem := arweaveDataItem(t)
	msg := testdata.NewTestMsg(dataItem.GetCreator())
	tx := createTxWithMsgs(t, &dataItem, msg)

	result, err := GetDataItemMsg(tx)

	require.Nil(t, result)
	require.ErrorIs(t, err, types.ErrTooManyMessages)
}

func TestGetDataItemMsgDataItemAfterMsg(t *testing.T) {
	dataItem := arweaveDataItem(t)
	msg := testdata.NewTestMsg(dataItem.GetCreator())
	tx := createTxWithMsgs(t, msg, &dataItem)

	result, err := GetDataItemMsg(tx)

	require.Nil(t, result)
	require.ErrorIs(t, err, types.ErrTooManyMessages)
}
