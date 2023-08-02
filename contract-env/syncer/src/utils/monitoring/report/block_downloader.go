package report

import "go.uber.org/atomic"

type BlockDownloaderErrors struct {
	BlockDownloadErrors   atomic.Int64 `json:"block_download"`
	BlockValidationErrors atomic.Int64 `json:"block_validation"`
}

type BlockDownloaderState struct {
	CurrentHeight                   atomic.Int64   `json:"syncer_current_height"`
	BlocksBehind                    atomic.Int64   `json:"syncer_blocks_behind"`
	AverageBlocksProcessedPerMinute atomic.Float64 `json:"average_blocks_processed_per_minute"`
}

type BlockDownloaderReport struct {
	State  BlockDownloaderState  `json:"state"`
	Errors BlockDownloaderErrors `json:"errors"`
}
