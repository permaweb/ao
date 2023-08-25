package arweave

import (
	"bytes"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"math/big"

	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"

	tmcrypto "github.com/cometbft/cometbft/crypto"
)

func (pk *PubKey) Address() tmcrypto.Address {
	return tmcrypto.AddressHash(pk.Key)
}

func (pk *PubKey) VerifySignature(data []byte, signature []byte) bool {
	hashed := sha256.Sum256(data)
	key := pk.publicKey()
	err := rsa.VerifyPSS(&key, crypto.SHA256, hashed[:], []byte(signature), &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthAuto,
		Hash:       crypto.SHA256,
	})
	return err == nil
}

func (pk *PubKey) publicKey() rsa.PublicKey {
	return rsa.PublicKey{
		N: new(big.Int).SetBytes(pk.Key),
		E: 65537, //"AQAB"
	}
}

func (pk *PubKey) Bytes() []byte {
	return pk.Key
}

func (pk *PubKey) Equals(other cryptotypes.PubKey) bool {
	return pk.Type() == other.Type() && bytes.Equal(pk.Bytes(), other.Bytes())
}

func (pk *PubKey) Type() string {
	return "arweave"
}

func createPublicKey(key rsa.PublicKey) *PubKey {
	return &PubKey{key.N.Bytes()}
}

func FromOwner(owner []byte) *PubKey {
	return &PubKey{owner}
}
