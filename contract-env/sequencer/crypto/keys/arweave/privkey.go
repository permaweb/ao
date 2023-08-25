package arweave

import (
	"bytes"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"

	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"
)

func (sk *PrivKey) Bytes() []byte {
	return sk.Key
}

func (sk *PrivKey) Sign(data []byte) ([]byte, error) {
	key, err := sk.rsaPrivateKey()
	if err != nil {
		return nil, err
	}

	hashed := sha256.Sum256(data)
	return rsa.SignPSS(rand.Reader, key, crypto.SHA256, hashed[:], &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthAuto,
		Hash:       crypto.SHA256,
	})
}

func (sk *PrivKey) rsaPrivateKey() (*rsa.PrivateKey, error) {
	return x509.ParsePKCS1PrivateKey(sk.Key)
}

func (sk *PrivKey) PubKey() cryptotypes.PubKey {
	key, err := sk.rsaPrivateKey()
	if err != nil {
		panic(err)
	}

	return createPublicKey(key.PublicKey)
}

func (sk *PrivKey) Equals(other cryptotypes.LedgerPrivKey) bool {
	otherSk, ok := other.(*PrivKey)
	if !ok {
		return false
	}
	return bytes.Equal(sk.Key, otherSk.Key)
}

func (sk *PrivKey) Type() string {
	return "arweave"
}

func CreatePrivateKey(key rsa.PrivateKey) *PrivKey {
	return &PrivKey{x509.MarshalPKCS1PrivateKey(&key)}
}
