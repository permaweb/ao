package bundlr

import (
	"crypto/ecdsa"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common/hexutil"
	ethereum_crypto "github.com/ethereum/go-ethereum/crypto"
)

type EthereumSigner struct {
	PrivateKey *ecdsa.PrivateKey
	Owner      []byte
}

func NewEthereumSigner(privateKeyHex string) (self *EthereumSigner, err error) {
	self = new(EthereumSigner)

	// Parse the private key
	buf, err := hexutil.Decode(privateKeyHex)
	if err != nil {
		return
	}

	self.PrivateKey, err = ethereum_crypto.ToECDSA(buf)
	if err != nil {
		return
	}

	return
}

func (self *EthereumSigner) Sign(data []byte) (signature []byte, err error) {
	hashed := EthereumHash(data)
	return ethereum_crypto.Sign(hashed[:], self.PrivateKey)
}

func EthereumHash(data []byte) []byte {
	hash, _ := accounts.TextAndHash(data)
	return hash
}

func (self *EthereumSigner) Verify(data []byte, signature []byte) (err error) {
	if len(signature) == ethereum_crypto.SignatureLength {
		// remove recovery ID (V) if contained in the signature
		signature = signature[:len(signature)-1]
	}

	if len(self.Owner) == 0 {
		self.Owner = self.GetOwner()
	}

	hashed := EthereumHash(data)
	ok := ethereum_crypto.VerifySignature(self.Owner, hashed[:], signature)
	if !ok {
		err = ErrEthereumSignatureMismatch
		return
	}

	return
}

// func (self *EthereumSigner) Verify(data []byte, signature []byte) (err error) {
// 	hashed := sha256.Sum256(data)

// 	if len(self.Owner) == 0 {
// 		self.Owner = self.GetOwner()
// 	}

// 	// Convert owner to public key bytes
// 	publicKeyECDSA, err := ethereum_crypto.UnmarshalPubkey(self.Owner)
// 	if err != nil {
// 		err = ErrUnmarshalEthereumPubKey
// 		return
// 	}
// 	publicKeyBytes := ethereum_crypto.FromECDSAPub(publicKeyECDSA)

// 	// Get the public key from the signature
// 	sigPublicKey, err := ethereum_crypto.Ecrecover(hashed[:], signature)
// 	if err != nil {
// 		return
// 	}

// 	// Check if the public key recovered from the signature matches the owner
// 	if !bytes.Equal(sigPublicKey, publicKeyBytes) {
// 		err = ErrEthereumSignatureMismatch
// 		return
// 	}

// 	return
// }

func (self *EthereumSigner) GetOwner() []byte {
	publicKeyECDSA, ok := self.PrivateKey.Public().(*ecdsa.PublicKey)
	if !ok {
		panic(ErrFailedToParseEthereumPublicKey)
	}

	return ethereum_crypto.FromECDSAPub(publicKeyECDSA)

}

func (self *EthereumSigner) GetType() SignatureType {
	return SignatureTypeEthereum
}

func (self *EthereumSigner) GetSignatureLength() int {
	return 65
}

func (self *EthereumSigner) GetOwnerLength() int {
	return 65
}
