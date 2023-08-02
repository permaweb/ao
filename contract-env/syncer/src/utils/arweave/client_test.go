package arweave

import (
	"context"
	"strings"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/sirupsen/logrus"
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
	config *config.Config
	client *Client
	log    *logrus.Entry
}

func (s *ClientTestSuite) SetupSuite() {
	s.ctx, s.cancel = context.WithCancel(context.Background())
	s.config = config.Default()
	s.log = logger.NewSublogger("arweave-test")
	s.client = NewClient(s.ctx, s.config)
	require.NotNil(s.T(), s.client)
}

func (s *ClientTestSuite) TearDownSuite() {
	s.cancel()
}

func (s *ClientTestSuite) TestGetNetworkInfo() {
	out, err := s.client.GetNetworkInfo(s.ctx)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), out)
	require.NotZero(s.T(), out.Blocks)
}

func (s *ClientTestSuite) TestGetPeerList() {
	out, err := s.client.GetPeerList(s.ctx)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), out)
	require.Greater(s.T(), len(out), 0)
}
func (s *ClientTestSuite) TestCheckPeer() {
	out, t, err := s.client.CheckPeerConnection(s.ctx, s.config.Arweave.NodeUrl)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), out)
	require.NotZero(s.T(), out.Blocks)
	require.NotZero(s.T(), t)
}

func (s *ClientTestSuite) TestGetBlockByHeight() {
	out, _, err := s.client.GetBlockByHeight(s.ctx, 1082024)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), out)
	require.NotZero(s.T(), out.Height)
	require.Greater(s.T(), len(out.Txs), 0)
}

func (s *ClientTestSuite) TestGetTransactionById() {
	out, err := s.client.GetTransactionById(s.ctx, "EOlTGnmAsif6zpZgzTGBP268bit_UIW3QX7uUx874PA")
	require.Nil(s.T(), err)
	require.NotNil(s.T(), out)
	require.NotZero(s.T(), out.ID)
}

func (s *ClientTestSuite) TestSetPeers() {
	tmp := strings.Clone(s.config.Arweave.NodeUrl)

	// Working peer only in tmp list
	s.client.SetPeers([]string{tmp})

	// Tmp break the main URL
	s.config.Arweave.NodeUrl = "https://google.com"
	defer func() {
		s.config.Arweave.NodeUrl = tmp
	}()
	out, err := s.client.GetNetworkInfo(s.ctx)
	require.Nil(s.T(), err)
	require.NotNil(s.T(), out)
	require.NotZero(s.T(), out.Blocks)
}
