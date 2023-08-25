package bundlr

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"errors"
	"math/big"

	"github.com/lestrrat-go/jwx/jwk"
)

type ArweaveSigner struct {
	PrivateKey *rsa.PrivateKey
	Owner      []byte
}

func NewArweaveSigner(privateKeyJWK string) (self *ArweaveSigner, err error) {
	// Parse the private key
	self = new(ArweaveSigner)
	set, err := jwk.Parse([]byte(privateKeyJWK))
	if err != nil {
		return
	}
	if set.Len() != 1 {
		err = errors.New("too many keys in signer's wallet")
		return
	}

	key, ok := set.Get(0)
	if !ok {
		err = errors.New("cannot access key in JWK")
		return
	}

	var rawkey interface{}
	err = key.Raw(&rawkey)
	if err != nil {
		return
	}

	self.PrivateKey, ok = rawkey.(*rsa.PrivateKey)
	if !ok {
		err = errors.New("private ")
		return
	}

	self.Owner = self.PrivateKey.PublicKey.N.Bytes()

	return
}

func (self *ArweaveSigner) Sign(data []byte) (signature []byte, err error) {
	hashed := sha256.Sum256(data)
	return rsa.SignPSS(rand.Reader, self.PrivateKey, crypto.SHA256, hashed[:], &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthAuto,
		Hash:       crypto.SHA256,
	})
}

func (self *ArweaveSigner) Verify(data []byte, signature []byte) (err error) {
	hashed := sha256.Sum256(data)

	ownerPublicKey := &rsa.PublicKey{
		N: new(big.Int).SetBytes([]byte(self.Owner)),
		E: 65537, //"AQAB"
	}

	return rsa.VerifyPSS(ownerPublicKey, crypto.SHA256, hashed[:], []byte(signature), &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthAuto,
		Hash:       crypto.SHA256,
	})
}

func (self *ArweaveSigner) GetOwner() []byte {
	return self.Owner
}

func (self *ArweaveSigner) GetType() SignatureType {
	return SignatureTypeArweave
}

func (self *ArweaveSigner) GetSignatureLength() int {
	return 512
}

func (self *ArweaveSigner) GetOwnerLength() int {
	return 512
}
