package config

import (
	"time"

	"github.com/spf13/viper"
)

type Contract struct {
	// Worker pool for fetching contact source and init state
	LoaderWorkerPoolSize int

	// Maksimum payloads in loader's queue
	LoaderWorkerQueueSize int

	// Possible contract source content types
	LoaderSupportedContentTypes []string

	// Max time confirmer will try to insert a batch of data to the database. 0 means no limit
	LoaderBackoffMaxElapsedTime time.Duration

	// Max time between retries to insert a batch of confirmations to  the database
	LoaderBackoffMaxInterval time.Duration

	// Acceptable duration for loading a single contract. After this time arweave client will be reset/
	LoaderBackoffAcceptableDuration time.Duration

	// Max time for a transaction to be downloaded. 0 means no limit
	TransactionMaxElapsedTime time.Duration

	// Max time between transaction download retries
	TransactionMaxInterval time.Duration

	// How many contracts are saved in one transaction
	StoreBatchSize int

	// How often is an insert triggered
	StoreInterval time.Duration

	// Max time store will try to insert a batch of data to the database
	// 0 means no limit
	// This should be 0,
	StoreBackoffMaxElapsedTime time.Duration

	// Max time between retries to insert a batch of confirmations to  the database
	StoreBackoffMaxInterval time.Duration

	// Max size of a message that can be published to Redis, in bytes. 10MB by default
	PublisherMaxMessageSize int

	// Saved contracts are published on this Redis channel
	PublisherRedisChannelName string

	// Saved contracts are published on this AppSync channel
	PublisherAppSyncChannelName string
}

func setContractDefaults() {
	viper.SetDefault("Contract.LoaderWorkerPoolSize", "50")
	viper.SetDefault("Contract.LoaderWorkerQueueSize", "100")
	viper.SetDefault("Contract.LoaderSupportedContentTypes", []string{"application/javascript", "application/wasm"})
	viper.SetDefault("Contract.LoaderBackoffMaxElapsedTime", "234s")
	viper.SetDefault("Contract.LoaderBackoffMaxInterval", "7s")
	viper.SetDefault("Contract.LoaderBackoffAcceptableDuration", "31s")
	viper.SetDefault("Contract.TransactionMaxElapsedTime", "5m")
	viper.SetDefault("Contract.TransactionMaxInterval", "10s")
	viper.SetDefault("Contract.StoreBatchSize", "10")
	viper.SetDefault("Contract.StoreInterval", "10s")
	viper.SetDefault("Contract.StoreBackoffMaxElapsedTime", "0")
	viper.SetDefault("Contract.StoreBackoffMaxInterval", "20s")
	viper.SetDefault("Contract.PublisherMaxMessageSize", "10485760")
	viper.SetDefault("Contract.PublisherRedisChannelName", "test")
	viper.SetDefault("Contract.PublisherAppSyncChannelName", "test")
}
