package config

import (
	"time"

	"github.com/spf13/viper"
)

type PeerMonitor struct {
	// Maximum time a peer is blacklisted.
	// Even after this duration is over it may take some time for the peer to be re-checked
	MaxTimeBlacklisted time.Duration

	// Maximum number of peers that can be removed from the blacklist
	// Peers that are blacklisted longer than `PeerMonitorMaxTimeBlacklisted` will get eventually re-used
	// To avoid spikes we can only remove at most this many peers from the blacklist in one try
	MaxPeersRemovedFromBlacklist int

	// Time between sending monitoring requests to peers
	// Peers are downloaded from the arweave API and checked in parallel by couple of workers
	Period time.Duration

	// Max number of peers that can be used for retrying requests
	MaxPeers int

	// Number of workers that check peers in parallel
	NumWorkers int

	// Number of peers pending verification in worker queue
	WorkerQueueSize int
}

func setPeerMonitorDefaults() {
	viper.SetDefault("PeerMonitor.MaxTimeBlacklisted", "30m")
	viper.SetDefault("PeerMonitor.MaxPeersRemovedFromBlacklist", "5")
	viper.SetDefault("PeerMonitor.Period", "10m")
	viper.SetDefault("PeerMonitor.MaxPeers", "15")
	viper.SetDefault("PeerMonitor.NumWorkers", "40")
	viper.SetDefault("PeerMonitor.WorkerQueueSize", "1000")
}
