package config

import "github.com/spf13/viper"

type TransactionDownloader struct {
	// Number of workers that download the transactions
	NumWorkers int

	// Max number of transactions that wait in the worker queue
	WorkerQueueSize int
}

func setTransactionDownloaderDefaults() {
	viper.SetDefault("TransactionDownloader.NumWorkers", "50")
	viper.SetDefault("TransactionDownloader.WorkerQueueSize", "10000")
}
