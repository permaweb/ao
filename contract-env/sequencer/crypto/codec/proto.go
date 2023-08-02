package codec

import (
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"

	"github.com/warp-contracts/sequencer/crypto/keys/arweave"
	"github.com/warp-contracts/sequencer/crypto/keys/ethereum"
)

func RegisterInterfaces(registry codectypes.InterfaceRegistry) {
	var arweavePublic *cryptotypes.PubKey
	registry.RegisterImplementations(arweavePublic, &arweave.PubKey{})

	var arweavePrivate *cryptotypes.PrivKey
	registry.RegisterImplementations(arweavePrivate, &arweave.PrivKey{})

	var ethereumPublic *cryptotypes.PubKey
	registry.RegisterImplementations(ethereumPublic, &ethereum.PubKey{})

	var ethereumPrivate *cryptotypes.PrivKey
	registry.RegisterImplementations(ethereumPrivate, &ethereum.PrivKey{})
}
