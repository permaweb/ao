package config

import (
	"time"

	"github.com/spf13/viper"
)

type Syncer struct {
	// Max time for a transaction to be downloaded. 0 means no limit
	BlockMaxElapsedTime time.Duration

	// Max time between transaction download retries
	BlockMaxInterval time.Duration

	// Max time for a transaction to be downloaded. 0 means no limit
	TransactionMaxElapsedTime time.Duration

	// Max time between transaction download retries
	TransactionMaxInterval time.Duration

	// Num of Interactions that are stored in the Store
	// before being inserted into the database in one db transaction and batch.
	StoreBatchSize int

	// After this time all Interactions in Store will be inserted to the database.
	// This is to avoid keeping them in the service for too long when waiting to fill the batch.
	StoreMaxTimeInQueue time.Duration

	// Max time between failed retries to save data.
	StoreMaxBackoffInterval time.Duration
}

func setSyncerDefaults() {
	viper.SetDefault("Syncer.BlockMaxElapsedTime", "0")
	viper.SetDefault("Syncer.BlockMaxInterval", "15s")
	viper.SetDefault("Syncer.TransactionMaxElapsedTime", "0")
	viper.SetDefault("Syncer.TransactionMaxInterval", "3s")
	viper.SetDefault("Syncer.StoreBatchSize", "500")
	viper.SetDefault("Syncer.StoreMaxTimeInQueue", "10s")
	viper.SetDefault("Syncer.StoreMaxBackoffInterval", "30s")
}
