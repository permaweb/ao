package report

import "go.uber.org/atomic"

type TransactionDownloaderErrors struct {
	Download                 atomic.Uint64 `json:"download"`
	PermanentDownloadFailure atomic.Uint64 `json:"permanent_download_failure"`
	Validation               atomic.Uint64 `json:"validation"`
}

type TransactionDownloaderState struct {
	TransactionsDownloaded                atomic.Uint64  `json:"transactions_downloaded"`
	AverageTransactionDownloadedPerMinute atomic.Float64 `json:"average_transactions_downloaded_per_minute"`
}

type TransactionDownloaderReport struct {
	State  TransactionDownloaderState  `json:"state"`
	Errors TransactionDownloaderErrors `json:"errors"`
}
