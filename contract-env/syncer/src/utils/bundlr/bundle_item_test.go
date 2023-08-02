package bundlr

import (
	"bytes"

	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/tool"

	"testing"
)

func TestBundleItemTestSuite(t *testing.T) {
	suite.Run(t, new(BundleItemTestSuite))
}

type BundleItemTestSuite struct {
	suite.Suite
	signer *ArweaveSigner
}

func (s *BundleItemTestSuite) SetupSuite() {
	var err error
	s.signer, err = NewArweaveSigner(EMPTY_ARWEAVE_WALLET)
	require.Nil(s.T(), err)
}

func (s *BundleItemTestSuite) TestSerialization() {
	item := BundleItem{
		SignatureType: SignatureTypeArweave,
		Target:        arweave.Base64String(tool.RandomString(32)),
		// Anchor: arweave.Base64String(tool.RandomString(32)),
		Tags: Tags{Tag{Name: "1", Value: "2"}, Tag{Name: "3", Value: "4"}},
		Data: arweave.Base64String(tool.RandomString(100)),
	}

	err := item.Sign(s.signer)
	require.Nil(s.T(), err)

	buf, err := item.Reader()
	require.Nil(s.T(), err)
	require.NotNil(s.T(), buf)

	reader := bytes.NewReader(buf.Bytes())
	parsed := BundleItem{}

	err = parsed.UnmarshalFromReader(reader)
	require.Nil(s.T(), err)
	require.Equal(s.T(), item.SignatureType, parsed.SignatureType)
	require.Equal(s.T(), item.Data, parsed.Data)
	require.Equal(s.T(), item.Tags, parsed.Tags)
}

func (s *BundleItemTestSuite) TestSize() {
	item := BundleItem{
		SignatureType: SignatureTypeArweave,
		Target:        arweave.Base64String(tool.RandomString(32)),
		Anchor:        arweave.Base64String(tool.RandomString(32)),
		Tags:          Tags{Tag{Name: "1", Value: "2"}, Tag{Name: "3", Value: "4"}},
		Data:          arweave.Base64String(tool.RandomString(100)),
	}

	err := item.Sign(s.signer)
	require.Nil(s.T(), err)
	require.Nil(s.T(), item.Verify())
	require.Nil(s.T(), item.VerifySignature())

	buf, err := item.Reader()
	require.Nil(s.T(), err)
	require.NotNil(s.T(), buf)
	require.Equal(s.T(), item.Size(), len(buf.Bytes()))
}

func (s *BundleItemTestSuite) TestMarshalTo() {
	item := BundleItem{
		SignatureType: SignatureTypeArweave,
		Target:        arweave.Base64String(tool.RandomString(32)),
		Anchor:        arweave.Base64String(tool.RandomString(32)),
		Tags:          Tags{Tag{Name: "1", Value: "2"}, Tag{Name: "3", Value: "4"}},
		Data:          arweave.Base64String(tool.RandomString(100)),
	}

	err := item.Sign(s.signer)
	require.Nil(s.T(), err)

	buf := make([]byte, item.Size())
	n, err := item.MarshalTo(buf)
	require.Nil(s.T(), err)
	require.Equal(s.T(), item.Size(), n)
	require.Equal(s.T(), item.Size(), len(buf))
}

func (s *BundleItemTestSuite) TestMarshalUnmarshal() {
	item := BundleItem{
		SignatureType: SignatureTypeArweave,
		Target:        arweave.Base64String(tool.RandomString(32)),
		Anchor:        arweave.Base64String(tool.RandomString(32)),
		Tags:          Tags{Tag{Name: "1", Value: "2"}, Tag{Name: "3", Value: "4"}},
		Data:          arweave.Base64String(tool.RandomString(100)),
	}

	err := item.Sign(s.signer)
	require.Nil(s.T(), err)
	require.Nil(s.T(), item.Verify())
	require.Nil(s.T(), item.VerifySignature())

	buf, err := item.Marshal()
	require.Nil(s.T(), err)
	require.NotNil(s.T(), buf)

	parsed := BundleItem{}
	err = parsed.Unmarshal(buf)
	require.Nil(s.T(), err)
	// fmt.Printf("BUF %s\n", string(buf))
	// fmt.Printf("ITEM %v\n", item.String())
	// fmt.Printf("PARSED %v\n", parsed.String())

	require.Nil(s.T(), parsed.Verify())
	require.Nil(s.T(), parsed.VerifySignature())
	require.Equal(s.T(), item.Size(), parsed.Size())
	require.Equal(s.T(), item.Signature, parsed.Signature)
}

func (s *BundleItemTestSuite) TestMarshalUnmarshalJSON() {
	item := BundleItem{
		SignatureType: SignatureTypeArweave,
		Target:        arweave.Base64String(tool.RandomString(32)),
		Anchor:        arweave.Base64String(tool.RandomString(32)),
		Tags:          Tags{Tag{Name: "1", Value: "2"}, Tag{Name: "3", Value: "4"}},
		Data:          arweave.Base64String(tool.RandomString(100)),
	}

	err := item.Sign(s.signer)
	require.Nil(s.T(), err)
	require.Nil(s.T(), item.Verify())
	require.Nil(s.T(), item.VerifySignature())

	buf, err := item.MarshalJSON()
	require.Nil(s.T(), err)
	require.NotNil(s.T(), buf)

	parsed := BundleItem{}
	err = parsed.UnmarshalJSON(buf)
	require.Nil(s.T(), err)

	// fmt.Printf("BUF %s\n", string(buf))
	// fmt.Printf("ITEM %v\n", item.String())
	// fmt.Printf("PARSED %v\n", parsed.String())

	require.Nil(s.T(), parsed.Verify())
	require.Nil(s.T(), parsed.VerifySignature())
	require.Equal(s.T(), item.Size(), parsed.Size())
	require.Equal(s.T(), item.Signature, parsed.Signature)
}
