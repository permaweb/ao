package config

import (
	"time"

	"github.com/spf13/viper"
)

type Gateway struct {
	// REST API address. API used for monitoring etc.
	ServerListenAddress string

	// Max time a http request can take
	ServerRequestTimeout time.Duration
}

func setGatewayDefaults() {
	viper.SetDefault("Gateway.ServerListenAddress", "0.0.0.0:4000")
	viper.SetDefault("Gateway.ServerRequestTimeout", "30s")
}
