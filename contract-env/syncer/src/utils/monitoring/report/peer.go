package report

import "go.uber.org/atomic"

type PeerErrors struct {
	PeerDownloadErrors atomic.Uint64 `json:"peer_download"`
}

type PeerState struct {
	PeersBlacklisted atomic.Uint64 `json:"peers_blacklisted"`
	NumPeers         atomic.Uint64 `json:"num_peers"`
}

type PeerReport struct {
	State  PeerState  `json:"state"`
	Errors PeerErrors `json:"errors"`
}
