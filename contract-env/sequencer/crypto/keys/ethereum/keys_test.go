package ethereum_test

import (
	"testing"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/stretchr/testify/require"

	"github.com/warp-contracts/sequencer/crypto/keys/ethereum"
	"github.com/warp-contracts/sequencer/x/sequencer/ante"
	"github.com/warp-contracts/syncer/src/utils/bundlr"
)

func createPrivateKey(t *testing.T) ethereum.PrivKey {
	privKeyBytes, err := hexutil.Decode(ante.ETHEREUM_PRIVATE_KEY)
	require.NoError(t, err)
	return ethereum.PrivKey{privKeyBytes}
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

func createSyncerSigner(t *testing.T) *bundlr.EthereumSigner {
	signer, err := bundlr.NewEthereumSigner(ante.ETHEREUM_PRIVATE_KEY)
	require.NoError(t, err)
	return signer
}

func TestConsistencyWithSyncerSigner(t *testing.T) {
	privKey := createPrivateKey(t)
	signer := createSyncerSigner(t)
	data := []byte("some data to check the signature")

	keySig, err := privKey.Sign(data)
	require.NoError(t, err)

	signerSig, err := signer.Sign(data)
	require.NoError(t, err)

	require.Equal(t, keySig, signerSig)
}
