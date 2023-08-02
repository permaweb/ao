package arweave_test

import (
	"github.com/stretchr/testify/require"
	"testing"

	"github.com/warp-contracts/sequencer/crypto/keys/arweave"
	"github.com/warp-contracts/sequencer/x/sequencer/ante"
	"github.com/warp-contracts/syncer/src/utils/bundlr"
)

func createPrivateKey(t *testing.T) *arweave.PrivKey {
	signer, err := bundlr.NewArweaveSigner(ante.EMPTY_ARWEAVE_WALLET)
	require.NoError(t, err)
	return arweave.CreatePrivateKey(*signer.PrivateKey)
}

func TestSignAndVerify(t *testing.T) {
	privKey := createPrivateKey(t)
	pubKey := privKey.PubKey()
	data := []byte("data to sign")

	signature, err := privKey.Sign(data)
	require.NoError(t, err)

	ok := pubKey.VerifySignature(data, signature)
	require.True(t, ok)
}
