package monitor_syncer

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Collector struct {
	monitor *Monitor

	// Run
	StartTimestamp      *prometheus.Desc
	UpForSeconds        *prometheus.Desc
	NumWatchdogRestarts *prometheus.Desc

	// Network
	NetworkInfoDownloadErrors       *prometheus.Desc
	ArweaveCurrentHeight            *prometheus.Desc
	ArweaveLastNetworkInfoTimestamp *prometheus.Desc

	// BlockDownloader
	BlockDownloadErrors             *prometheus.Desc
	BlockValidationErrors           *prometheus.Desc
	BlockCurrentHeight              *prometheus.Desc
	BlocksBehind                    *prometheus.Desc
	AverageBlocksProcessedPerMinute *prometheus.Desc

	// TransactionDownloader
	TransactionsDownloaded                *prometheus.Desc
	AverageTransactionDownloadedPerMinute *prometheus.Desc
	TxPermanentDownloadErrors             *prometheus.Desc
	TxValidationErrors                    *prometheus.Desc
	TxDownloadErrors                      *prometheus.Desc

	// PeerMonitor
	PeersBlacklisted   *prometheus.Desc
	NumPeers           *prometheus.Desc
	PeerDownloadErrors *prometheus.Desc

	// Syncer
	FinishedHeight                    *prometheus.Desc
	AverageInteractionsSavedPerMinute *prometheus.Desc
	InteractionsSaved                 *prometheus.Desc
	FailedInteractionParsing          *prometheus.Desc

	DbInteractionInsertError          *prometheus.Desc
	DbLastTransactionBlockHeightError *prometheus.Desc
}

func NewCollector() *Collector {
	return &Collector{
		// Run
		StartTimestamp:      prometheus.NewDesc("start_timestamp", "", nil, nil),
		UpForSeconds:        prometheus.NewDesc("up_for_seconds", "", nil, nil),
		NumWatchdogRestarts: prometheus.NewDesc("num_watchdog_restarts", "", nil, nil),

		// NetworkMonitor
		NetworkInfoDownloadErrors:       prometheus.NewDesc("error_network_info_download", "", nil, nil),
		ArweaveCurrentHeight:            prometheus.NewDesc("arweave_current_height", "", nil, nil),
		ArweaveLastNetworkInfoTimestamp: prometheus.NewDesc("arweave_last_network_info_timestamp", "", nil, nil),

		// BlockDownloader
		BlockDownloadErrors:             prometheus.NewDesc("error_block_download", "", nil, nil),
		BlockValidationErrors:           prometheus.NewDesc("error_block_validation", "", nil, nil),
		BlockCurrentHeight:              prometheus.NewDesc("block_current_height", "", nil, nil),
		BlocksBehind:                    prometheus.NewDesc("blocks_behind", "", nil, nil),
		AverageBlocksProcessedPerMinute: prometheus.NewDesc("average_blocks_processed_per_minute", "", nil, nil),

		// TransactionDownloader
		TransactionsDownloaded:                prometheus.NewDesc("transactions_downloaded", "", nil, nil),
		AverageTransactionDownloadedPerMinute: prometheus.NewDesc("average_transactions_downloaded_per_minute", "", nil, nil),
		TxValidationErrors:                    prometheus.NewDesc("error_tx_validation", "", nil, nil),
		TxDownloadErrors:                      prometheus.NewDesc("error_tx_download", "", nil, nil),
		TxPermanentDownloadErrors:             prometheus.NewDesc("error_tx_permanent_download", "", nil, nil),

		// PeerMonitor
		PeersBlacklisted:   prometheus.NewDesc("peers_blacklisted", "", nil, nil),
		NumPeers:           prometheus.NewDesc("num_peers", "", nil, nil),
		PeerDownloadErrors: prometheus.NewDesc("error_peer_download", "", nil, nil),

		// Syncer
		FinishedHeight:                    prometheus.NewDesc("finished_height", "", nil, nil),
		AverageInteractionsSavedPerMinute: prometheus.NewDesc("average_interactions_saved_per_minute", "", nil, nil),
		InteractionsSaved:                 prometheus.NewDesc("interactions_saved", "", nil, nil),
		FailedInteractionParsing:          prometheus.NewDesc("failed_interaction_parsing", "", nil, nil),
		DbInteractionInsertError:          prometheus.NewDesc("error_db_interaction_insert", "", nil, nil),
		DbLastTransactionBlockHeightError: prometheus.NewDesc("error_db_last_tx_block_height", "", nil, nil),
	}
}

func (self *Collector) WithMonitor(m *Monitor) *Collector {
	self.monitor = m
	return self
}

func (self *Collector) Describe(ch chan<- *prometheus.Desc) {
	// Run
	ch <- self.UpForSeconds
	ch <- self.StartTimestamp
	ch <- self.NumWatchdogRestarts

	// NetworkInfo
	ch <- self.NetworkInfoDownloadErrors
	ch <- self.ArweaveCurrentHeight
	ch <- self.ArweaveLastNetworkInfoTimestamp

	// BlockDownloader
	ch <- self.BlockValidationErrors
	ch <- self.BlockDownloadErrors
	ch <- self.BlockCurrentHeight
	ch <- self.BlocksBehind
	ch <- self.AverageBlocksProcessedPerMinute

	// TransactionDownloader
	ch <- self.TransactionsDownloaded
	ch <- self.AverageTransactionDownloadedPerMinute
	ch <- self.TxValidationErrors
	ch <- self.TxDownloadErrors
	ch <- self.TxPermanentDownloadErrors

	// PeerMonitor
	ch <- self.PeersBlacklisted
	ch <- self.NumPeers
	ch <- self.PeerDownloadErrors

	// Syncer
	ch <- self.FinishedHeight
	ch <- self.AverageInteractionsSavedPerMinute
	ch <- self.InteractionsSaved
	ch <- self.FailedInteractionParsing
	ch <- self.DbInteractionInsertError
	ch <- self.DbLastTransactionBlockHeightError
}

// Collect implements required collect function for all promehteus collectors
func (self *Collector) Collect(ch chan<- prometheus.Metric) {
	// Run
	ch <- prometheus.MustNewConstMetric(self.UpForSeconds, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.UpForSeconds.Load()))
	ch <- prometheus.MustNewConstMetric(self.StartTimestamp, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.StartTimestamp.Load()))
	ch <- prometheus.MustNewConstMetric(self.NumWatchdogRestarts, prometheus.CounterValue, float64(self.monitor.Report.Run.Errors.NumWatchdogRestarts.Load()))

	// NetworkInfo
	ch <- prometheus.MustNewConstMetric(self.NetworkInfoDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.NetworkInfo.Errors.NetworkInfoDownloadErrors.Load()))
	ch <- prometheus.MustNewConstMetric(self.ArweaveCurrentHeight, prometheus.GaugeValue, float64(self.monitor.Report.NetworkInfo.State.ArweaveCurrentHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.ArweaveLastNetworkInfoTimestamp, prometheus.GaugeValue, float64(self.monitor.Report.NetworkInfo.State.ArweaveLastNetworkInfoTimestamp.Load()))

	// BlockDownloader
	ch <- prometheus.MustNewConstMetric(self.BlockValidationErrors, prometheus.CounterValue, float64(self.monitor.Report.BlockDownloader.Errors.BlockValidationErrors.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlockDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.BlockDownloader.Errors.BlockDownloadErrors.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlockCurrentHeight, prometheus.GaugeValue, float64(self.monitor.Report.BlockDownloader.State.CurrentHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlocksBehind, prometheus.GaugeValue, float64(self.monitor.Report.BlockDownloader.State.BlocksBehind.Load()))
	ch <- prometheus.MustNewConstMetric(self.AverageBlocksProcessedPerMinute, prometheus.GaugeValue, float64(self.monitor.Report.BlockDownloader.State.AverageBlocksProcessedPerMinute.Load()))

	// TransactionDownloader
	ch <- prometheus.MustNewConstMetric(self.TransactionsDownloaded, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.State.TransactionsDownloaded.Load()))
	ch <- prometheus.MustNewConstMetric(self.AverageTransactionDownloadedPerMinute, prometheus.GaugeValue, float64(self.monitor.Report.TransactionDownloader.State.AverageTransactionDownloadedPerMinute.Load()))
	ch <- prometheus.MustNewConstMetric(self.TxValidationErrors, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.Errors.Validation.Load()))
	ch <- prometheus.MustNewConstMetric(self.TxPermanentDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.Errors.PermanentDownloadFailure.Load()))
	ch <- prometheus.MustNewConstMetric(self.TxDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.Errors.Download.Load()))

	// PeerMonitor
	ch <- prometheus.MustNewConstMetric(self.PeersBlacklisted, prometheus.GaugeValue, float64(self.monitor.Report.Peer.State.PeersBlacklisted.Load()))
	ch <- prometheus.MustNewConstMetric(self.NumPeers, prometheus.GaugeValue, float64(self.monitor.Report.Peer.State.NumPeers.Load()))
	ch <- prometheus.MustNewConstMetric(self.PeerDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.Peer.Errors.PeerDownloadErrors.Load()))

	// Syncer
	ch <- prometheus.MustNewConstMetric(self.FinishedHeight, prometheus.GaugeValue, float64(self.monitor.Report.Syncer.State.FinishedHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.AverageInteractionsSavedPerMinute, prometheus.GaugeValue, float64(self.monitor.Report.Syncer.State.AverageInteractionsSavedPerMinute.Load()))
	ch <- prometheus.MustNewConstMetric(self.InteractionsSaved, prometheus.CounterValue, float64(self.monitor.Report.Syncer.State.InteractionsSaved.Load()))
	ch <- prometheus.MustNewConstMetric(self.FailedInteractionParsing, prometheus.CounterValue, float64(self.monitor.Report.Syncer.State.FailedInteractionParsing.Load()))
	ch <- prometheus.MustNewConstMetric(self.DbInteractionInsertError, prometheus.CounterValue, float64(self.monitor.Report.Syncer.Errors.DbInteractionInsert.Load()))
	ch <- prometheus.MustNewConstMetric(self.DbLastTransactionBlockHeightError, prometheus.CounterValue, float64(self.monitor.Report.Syncer.Errors.DbLastTransactionBlockHeightError.Load()))

}
