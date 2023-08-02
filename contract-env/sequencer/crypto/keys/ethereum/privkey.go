package ethereum

import (
	"bytes"
	"crypto/ecdsa"

	ethereum_crypto "github.com/ethereum/go-ethereum/crypto"

	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"

	"github.com/warp-contracts/syncer/src/utils/bundlr"
)

func (sk *PrivKey) Bytes() []byte {
	return sk.Key
}

func (sk *PrivKey) Sign(data []byte) ([]byte, error) {
	hashed := bundlr.EthereumHash(data)
	return ethereum_crypto.Sign(hashed[:], sk.ecdsaPrivateKey())
}

func (sk *PrivKey) ecdsaPrivateKey() *ecdsa.PrivateKey {
	key, err := ethereum_crypto.ToECDSA(sk.Key)
	if err != nil {
		panic(err)
	}

	return key
}

func (sk *PrivKey) PubKey() cryptotypes.PubKey {
	publicKey, ok := sk.ecdsaPrivateKey().Public().(*ecdsa.PublicKey)
	if !ok {
		panic(bundlr.ErrFailedToParseEthereumPublicKey)
	}
	return &PubKey{ethereum_crypto.FromECDSAPub(publicKey)}
}

func (sk *PrivKey) Equals(other cryptotypes.LedgerPrivKey) bool {
	return sk.Type() == other.Type() && bytes.Equal(sk.Bytes(), other.Bytes())

}

func (sk *PrivKey) Type() string {
	return "ethereum"
}
