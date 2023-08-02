package config

import (
	"time"

	"github.com/spf13/viper"
)

type Checker struct {
	// Minimal number of blocks to wait before checking the bundle
	MinConfirmationBlocks int64

	// Number of bundles to confirm in one run.
	MaxBundlesPerRun int

	// Number of workers that check bundles in parallel
	WorkerPoolSize int

	// Size of the queue for workers
	WorkerQueueSize int

	// How often for unfinished checks
	PollerInterval time.Duration

	// After this time retry checking the bundle
	PollerRetryCheckAfter time.Duration
}

func setCheckerDefaults() {
	viper.SetDefault("Checker.MinConfirmationBlocks", "52")
	viper.SetDefault("Checker.MaxBundlesPerRun", "50")
	viper.SetDefault("Checker.WorkerPoolSize", "50")
	viper.SetDefault("Checker.WorkerQueueSize", "150")
	viper.SetDefault("Checker.PollerInterval", "1m")
	viper.SetDefault("Checker.PollerRetryCheckAfter", "60m")
}
