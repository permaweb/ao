package bundlr

import (
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"testing"

	"github.com/ethereum/go-ethereum/common/hexutil"
)

const ETHEREUM_PRIVATE_KEY = `0xf4a2b939592564feb35ab10a8e04f6f2fe0943579fb3c9c33505298978b74893`

func TestEthereumSignerTestSuite(t *testing.T) {
	suite.Run(t, new(EthereumSignerTestSuite))
}

type EthereumSignerTestSuite struct {
	suite.Suite
}

func (s *EthereumSignerTestSuite) SetupSuite() {

}

func (s *EthereumSignerTestSuite) TearDownSuite() {
}

func (s *EthereumSignerTestSuite) TestCreation() {
	signer, err := NewEthereumSigner(ETHEREUM_PRIVATE_KEY)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), signer)
	owner, err := hexutil.Decode("0x04345f1a86ebf24a6dbeff80f6a2a574d46efaa3ad3988de94aa68b695f09db9ddca37439f99548da0a1fe4acf4721a945a599a5d789c18a06b20349e803fdbbe3")
	require.Nil(s.T(), err)
	require.Equal(s.T(), len(owner), signer.GetOwnerLength())
	require.Equal(s.T(), signer.GetOwnerLength(), len(signer.GetOwner()))
	require.Equal(s.T(), owner, signer.GetOwner())
}

func (s *EthereumSignerTestSuite) TestSignAndVerify() {
	signer, err := NewEthereumSigner(ETHEREUM_PRIVATE_KEY)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), signer)

	data := []byte("to be signed")

	signature, err := signer.Sign(data)
	require.Nil(s.T(), err)
	require.Equal(s.T(), len(signature), signer.GetSignatureLength())

	err = signer.Verify(data, signature)
	require.Nil(s.T(), err)
}
