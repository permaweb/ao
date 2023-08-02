package config

import (
	"time"

	"github.com/spf13/viper"
)

type Relayer struct {
	// Websocket url of the Warp's sequencer
	SequencerUrl string

	// How many incomming events should be stored in channel
	SequencerQueueSize int

	// Worker pool size for downloading Sequencer's blocks
	SourceMaxWorkers int

	// Worker pool queue size for downloading Sequencer's  blocks
	SourceMaxQueueSize int

	// Max time a request should be retried. 0 means no limit.
	SourceBackoffMaxElapsedTime time.Duration

	// Max time between failed retries to save data.
	SourceBackoffMaxInterval time.Duration

	// How many blocks are downloaded in parallel
	SourceBatchSize int
}

func setRelayerDefaults() {
	viper.SetDefault("Relayer.SequencerUrl", "tcp://127.0.0.1:26657")
	viper.SetDefault("Relayer.SequencerQueueSize", "100")
	viper.SetDefault("Relayer.SourceMaxWorkers", "50")
	viper.SetDefault("Relayer.SourceMaxQueueSize", "1")
	viper.SetDefault("Relayer.SourceBackoffMaxElapsedTime", "30s")
	viper.SetDefault("Relayer.SourceBackoffMaxInterval", "2s")
	viper.SetDefault("Relayer.SourceBatchSize", "10")
}
