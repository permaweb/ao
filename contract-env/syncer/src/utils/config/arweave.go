package config

import (
	"time"

	"github.com/spf13/viper"
)

type Arweave struct {
	// URL to arweave.net
	NodeUrl string

	// Time limit for requests. The timeout includes connection time, any
	// redirects, and reading the response body
	RequestTimeout time.Duration

	// Miminum time a peer needs to answer in order to be considered responsive.
	// This should be much smaller than request timeout
	CheckPeerTimeout time.Duration

	// Maximum amount of time a dial will wait for a connect to complete.
	DialerTimeout time.Duration

	// Interval between keep-alive probes for an active network connection.
	DialerKeepAlive time.Duration

	// Maximum amount of time an idle (keep-alive) connection will remain idle before closing itself.
	IdleConnTimeout time.Duration

	// Maximum amount of time waiting to wait for a TLS handshake
	TLSHandshakeTimeout time.Duration

	// https://ar-io.zendesk.com/hc/en-us/articles/7595655106971-arweave-net-Rate-Limits
	// Time in which max num of requests is enforced
	LimiterInterval time.Duration

	// Max num requests to particular peer per interval
	LimiterBurstSize int

	// Limit is a float numbef = max frequency per second. Whenever a HTTP 429 Too Many Requests is received we multiply limit by this factor.
	// This way even if the limit is set too high eventually it'll get small enough.
	LimiterDecreaseFactor float64

	// How often limiters get decreased. This timeout won't allow sudden burst to decrease the limit too much
	LimiterDecreaseInterval time.Duration
}

func setArweaveDefaults() {
	viper.SetDefault("Arweave.NodeUrl", "https://arweave.net")
	viper.SetDefault("Arweave.RequestTimeout", "30s")
	viper.SetDefault("Arweave.CheckPeerTimeout", "1s")
	viper.SetDefault("Arweave.DialerTimeout", "30s")
	viper.SetDefault("Arweave.DialerKeepAlive", "15s")
	viper.SetDefault("Arweave.IdleConnTimeout", "31s")
	viper.SetDefault("Arweave.TLSHandshakeTimeout", "10s")
	viper.SetDefault("Arweave.LimiterInterval", "1s")
	viper.SetDefault("Arweave.LimiterBurstSize", "15")
	viper.SetDefault("Arweave.LimiterDecreaseFactor", "1.0")
	viper.SetDefault("Arweave.LimiterDecreaseInterval", "2m")
}
