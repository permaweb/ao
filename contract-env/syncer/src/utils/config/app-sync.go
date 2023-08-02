package config

import (
	"time"

	"github.com/spf13/viper"
)

type AppSync struct {
	// Security token for AppSync
	Token string

	// URL of the AppSync endpoint
	Url string

	// Num of workers that send GQL requests
	MaxWorkers int

	// Max num of requests in worker's queue
	MaxQueueSize int

	// Max time a request should be retried. 0 means no limit.
	BackoffMaxElapsedTime time.Duration

	// Max time between failed retries to save data.
	BackoffMaxInterval time.Duration
}

func setAppSyncDefaults() {
	viper.SetDefault("AppSync.Token", "token")
	viper.SetDefault("AppSync.Url", "https://6z7ifnfgrfhnxm57ky46bus2su.appsync-api.eu-north-1.amazonaws.com/graphql")
	viper.SetDefault("AppSync.MaxWorkers", "5")
	viper.SetDefault("AppSync.MaxQueueSize", "5")
	viper.SetDefault("AppSync.BackoffMaxElapsedTime", "2m")
	viper.SetDefault("AppSync.BackoffMaxInterval", "10s")
}
