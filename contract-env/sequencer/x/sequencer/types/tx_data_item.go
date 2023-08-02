package types

import (
	"github.com/cosmos/cosmos-sdk/client"

	sdk "github.com/cosmos/cosmos-sdk/types"
	txsigning "github.com/cosmos/cosmos-sdk/types/tx/signing"
	authsigning "github.com/cosmos/cosmos-sdk/x/auth/signing"
)

func BroadcastDataItem(ctx client.Context, dataItem MsgDataItem) (*sdk.TxResponse, error) {
	tx, err := createTxWithDataItem(ctx, dataItem)
	if err != nil {
		return nil, err
	}

	txBytes, err := ctx.TxConfig.TxEncoder()(tx)
	if err != nil {
		return nil, err
	}

	// Validates the message and sends it out
	return ctx.BroadcastTx(txBytes)
}

func createTxWithDataItem(ctx client.Context, dataItem MsgDataItem) (tx authsigning.Tx, err error) {
	txBuilder := ctx.TxConfig.NewTxBuilder()

	err = txBuilder.SetMsgs(&dataItem)
	if err != nil {
		return
	}

	signature, err := getSignature(dataItem)
	if err != nil {
		return
	}
	err = txBuilder.SetSignatures(signature)
	if err != nil {
		return
	}

	tx = txBuilder.GetTx()
	return
}

func getSignature(dataItem MsgDataItem) (signature txsigning.SignatureV2, err error) {
	pubKey, err := dataItem.GetPublicKey()
	if err != nil {
		return
	}
	nonce, err := dataItem.GetNonceFromTags()
	if err != nil {
		return
	}
	signature = txsigning.SignatureV2{
		PubKey:   pubKey,
		Sequence: nonce,
		Data: &txsigning.SingleSignatureData{
			SignMode:  txsigning.SignMode_SIGN_MODE_DIRECT,
			Signature: nil,
		},
	}
	return
}
