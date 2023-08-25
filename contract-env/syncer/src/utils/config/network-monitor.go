package config

import (
	"time"

	"github.com/spf13/viper"
)

type NetworkMonitor struct {

	// Time between requests to the Warp's Gateway for network info
	Period time.Duration

	// Minimum amount of confirmations (blocks on top of the given block) that are required to consider
	// a given block as confirmed (i.e. not being a fork)
	RequiredConfirmationBlocks int64

	// URL of the node we're using to get the current block height.
	// It's the Warp's Gateway URL to avoid race conditions
	Url string
}

func setNetworkMonitorDefaults() {
	viper.SetDefault("NetworkMonitor.Period", "10s")
	viper.SetDefault("NetworkMonitor.RequiredConfirmationBlocks", "10")
	viper.SetDefault("NetworkMonitor.Url", "https://gw.warp.cc/gateway/arweave")
}
