package types

import (
	"cosmossdk.io/errors"
	"strconv"

	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/warp-contracts/sequencer/crypto/keys/arweave"
	"github.com/warp-contracts/sequencer/crypto/keys/ethereum"

	"github.com/warp-contracts/syncer/src/utils/bundlr"
	"github.com/warp-contracts/syncer/src/utils/warp"
)

const TypeMsgDataItem = "data_item"

var _ sdk.Msg = &MsgDataItem{}

func (msg *MsgDataItem) Route() string {
	return RouterKey
}

func (msg *MsgDataItem) Type() string {
	return TypeMsgDataItem
}

func (msg *MsgDataItem) GetCreator() sdk.AccAddress {
	pubKey, err := msg.GetPublicKey()
	if err != nil {
		panic(err)
	}
	return sdk.AccAddress(pubKey.Address())
}

func (msg *MsgDataItem) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.GetCreator()}
}

func (msg *MsgDataItem) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgDataItem) ValidateBasic() (err error) {
	// Verifies DataItem acording to the ANS-104 standard. Verifies signature.
	// https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-104.md#21-verifying-a-dataitem
	err = msg.DataItem.Verify()
	if err != nil {
		return
	}

	err = msg.DataItem.VerifySignature()
	if err != nil {
		return
	}

	return nil
}

func (msg *MsgDataItem) GetNonceFromTags() (uint64, error) {
	for _, tag := range msg.DataItem.Tags {
		if tag.Name == warp.TagSequencerNonce {
			return strconv.ParseUint(tag.Value, 10, 64)
		}
	}
	return 0, errors.Wrapf(ErrNoSequencerNonceTag, "data item does not have \"%s\" tag", warp.TagSequencerNonce)
}

func (msg *MsgDataItem) GetPublicKey() (cryptotypes.PubKey, error) {
	return GetPublicKey(msg.DataItem.SignatureType, msg.DataItem.Owner)
}

func GetPublicKey(signatureType bundlr.SignatureType, owner []byte) (cryptotypes.PubKey, error) {
	switch signatureType {
	case bundlr.SignatureTypeArweave:
		pubKey := arweave.FromOwner(owner)
		return pubKey, nil
	case bundlr.SignatureTypeEthereum:
		pubKey, err := ethereum.FromOwner(owner)
		return pubKey, err
	default:
		return nil, bundlr.ErrUnsupportedSignatureType
	}
}
