package ethereum

import (
	"bytes"

	ethereum_crypto "github.com/ethereum/go-ethereum/crypto"

	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"

	tmcrypto "github.com/cometbft/cometbft/crypto"

	"github.com/warp-contracts/syncer/src/utils/bundlr"
)

func (pk *PubKey) Address() tmcrypto.Address {
	return tmcrypto.AddressHash(pk.Key)
}

func (pk *PubKey) VerifySignature(data []byte, signature []byte) bool {
	if len(signature) == ethereum_crypto.SignatureLength {
		// remove recovery ID (V) if contained in the signature
		signature = signature[:len(signature)-1]
	}

	hashed := bundlr.EthereumHash(data)
	return ethereum_crypto.VerifySignature(pk.Key, hashed[:], signature)
}

func (pk *PubKey) Bytes() []byte {
	return pk.Key
}

func (pk *PubKey) Equals(other cryptotypes.PubKey) bool {
	return pk.Type() == other.Type() && bytes.Equal(pk.Bytes(), other.Bytes())
}

func (pk *PubKey) Type() string {
	return "ethereum"
}

func FromOwner(owner []byte) (*PubKey, error) {
	key, err := ethereum_crypto.UnmarshalPubkey(owner)
	if err != nil {
		return nil, err
	}
	publicKeyBytes := ethereum_crypto.FromECDSAPub(key)
	return &PubKey{publicKeyBytes}, nil
}
