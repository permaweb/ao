package bundlr

import (
	"context"

	"github.com/warp-contracts/syncer/src/utils/config"

	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"testing"
)

func TestClientTestSuite(t *testing.T) {
	suite.Run(t, new(ClientTestSuite))
}

type ClientTestSuite struct {
	suite.Suite
	ctx    context.Context
	cancel context.CancelFunc
	signer *ArweaveSigner
	client *Client
}

func (s *ClientTestSuite) SetupSuite() {
	var err error
	s.signer, err = NewArweaveSigner(EMPTY_ARWEAVE_WALLET)
	require.Nil(s.T(), err)
	s.ctx, s.cancel = context.WithCancel(context.Background())
	s.client = NewClient(s.ctx, &config.Default().Bundlr)
}

func (s *ClientTestSuite) TearDownSuite() {
	s.cancel()
}

func (s *ClientTestSuite) TestUpload() {
	item := &BundleItem{
		Data: []byte("asdf"),
		Tags: Tags{Tag{Name: "name", Value: "value"}},
	}
	err := item.Sign(s.signer)
	require.Nil(s.T(), err)

	resp, r, err := s.client.Upload(s.ctx, item)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), r)
	require.NotNil(s.T(), resp)

	status, err := s.client.GetStatus(s.ctx, resp.Id)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), status)
}

func (s *ClientTestSuite) TestNestedBundleUpload() {
	// Nested item
	nested := &BundleItem{
		Data: []byte("asdf"),
		Tags: Tags{{Name: "name", Value: "value"}},
	}

	err := nested.Sign(s.signer)
	require.Nil(s.T(), err)

	// Bundle item
	item := &BundleItem{
		Tags: Tags{
			{
				Name:  "Bundle-Format",
				Value: "binary",
			},
			{
				Name:  "Bundle-Version",
				Value: "2.0.0",
			},
			{
				Name:  "App-Name",
				Value: "Warp",
			},
			{
				Name:  "Action",
				Value: "WarpInteraction",
			},
		},
	}
	err = item.NestBundles([]*BundleItem{nested})
	require.Nil(s.T(), err)

	err = item.Sign(s.signer)
	require.Nil(s.T(), err)

	resp, r, err := s.client.Upload(s.ctx, item)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), r)
	require.NotNil(s.T(), resp)

	status, err := s.client.GetStatus(s.ctx, resp.Id)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), status)
}
