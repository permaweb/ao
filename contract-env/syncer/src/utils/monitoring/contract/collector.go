package monitor_contract

import (
	"fmt"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/warp-contracts/syncer/src/utils/config"
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

	// Blocks
	BlocksBehind                    *prometheus.Desc
	BlockCurrentHeight              *prometheus.Desc
	AverageBlocksProcessedPerMinute *prometheus.Desc

	// PeerMonitor
	PeersBlacklisted *prometheus.Desc
	NumPeers         *prometheus.Desc

	// BlockDownloader
	BlockValidationErrors *prometheus.Desc
	BlockDownloadErrors   *prometheus.Desc
	PeerDownloadErrors    *prometheus.Desc

	// TransactionDownloader
	TransactionsDownloaded                *prometheus.Desc
	AverageTransactionDownloadedPerMinute *prometheus.Desc
	TxPermanentDownloadErrors             *prometheus.Desc
	TxValidationErrors                    *prometheus.Desc
	TxDownloadErrors                      *prometheus.Desc

	// Contractor
	DbContractInsertError             *prometheus.Desc
	DbSourceError                     *prometheus.Desc
	DbLastTransactionBlockHeightError *prometheus.Desc
	LoadPersistentContractError       *prometheus.Desc
	LoadContractError                 *prometheus.Desc
	LoadSourceError                   *prometheus.Desc
	LoadInitStateError                *prometheus.Desc
	FinishedHeight                    *prometheus.Desc
	AverageContractsSavedPerMinute    *prometheus.Desc
	ContractsSaved                    *prometheus.Desc

	// Redis publisher
	RedisPublishErrors     []*prometheus.Desc
	RedisPersistentErrors  []*prometheus.Desc
	RedisMessagesPublished []*prometheus.Desc
	RedisPoolHits          []*prometheus.Desc
	RedisPoolIdleConns     []*prometheus.Desc
	RedisPoolMisses        []*prometheus.Desc
	RedisPoolStaleConns    []*prometheus.Desc
	RedisPoolTimeouts      []*prometheus.Desc
	RedisPoolTotalConns    []*prometheus.Desc

	// App sync publisher
	AppSyncPublishErrors     *prometheus.Desc
	AppSyncPersistentErrors  *prometheus.Desc
	AppSyncMessagesPublished *prometheus.Desc
}

func NewCollector(config *config.Config) *Collector {
	labels := prometheus.Labels{
		"app": "contractor",
	}

	collector := &Collector{
		// Run
		StartTimestamp:      prometheus.NewDesc("start_timestamp", "", nil, labels),
		UpForSeconds:        prometheus.NewDesc("up_for_seconds", "", nil, labels),
		NumWatchdogRestarts: prometheus.NewDesc("num_watchdog_restarts", "", nil, labels),

		// NetworkMonitor
		NetworkInfoDownloadErrors:       prometheus.NewDesc("error_network_info_download", "", nil, labels),
		ArweaveCurrentHeight:            prometheus.NewDesc("arweave_current_height", "", nil, labels),
		ArweaveLastNetworkInfoTimestamp: prometheus.NewDesc("arweave_last_network_info_timestamp", "", nil, labels),

		// BlockDownloader
		BlockDownloadErrors:             prometheus.NewDesc("error_block_download", "", nil, labels),
		BlockValidationErrors:           prometheus.NewDesc("error_block_validation", "", nil, labels),
		BlockCurrentHeight:              prometheus.NewDesc("block_current_height", "", nil, labels),
		BlocksBehind:                    prometheus.NewDesc("blocks_behind", "", nil, labels),
		AverageBlocksProcessedPerMinute: prometheus.NewDesc("average_blocks_processed_per_minute", "", nil, labels),

		// TransactionDownloader
		TransactionsDownloaded:                prometheus.NewDesc("transactions_downloaded", "", nil, labels),
		AverageTransactionDownloadedPerMinute: prometheus.NewDesc("average_transactions_downloaded_per_minute", "", nil, labels),
		TxValidationErrors:                    prometheus.NewDesc("error_tx_validation", "", nil, labels),
		TxDownloadErrors:                      prometheus.NewDesc("error_tx_download", "", nil, labels),
		TxPermanentDownloadErrors:             prometheus.NewDesc("error_tx_permanent_download", "", nil, labels),

		// PeerMonitor
		PeersBlacklisted:   prometheus.NewDesc("peers_blacklisted", "", nil, labels),
		NumPeers:           prometheus.NewDesc("num_peers", "", nil, labels),
		PeerDownloadErrors: prometheus.NewDesc("error_peer_download", "", nil, labels),

		// Contractor
		DbContractInsertError:             prometheus.NewDesc("error_db_contract_insert", "", nil, labels),
		DbSourceError:                     prometheus.NewDesc("error_db_source", "", nil, labels),
		DbLastTransactionBlockHeightError: prometheus.NewDesc("error_db_last_transaction_block_height", "", nil, labels),
		LoadPersistentContractError:       prometheus.NewDesc("error_load_persistent_contract", "", nil, labels),
		LoadContractError:                 prometheus.NewDesc("error_load_contract", "", nil, labels),
		LoadSourceError:                   prometheus.NewDesc("error_load_source", "", nil, labels),
		LoadInitStateError:                prometheus.NewDesc("error_load_init_state", "", nil, labels),
		FinishedHeight:                    prometheus.NewDesc("finished_height", "", nil, labels),
		AverageContractsSavedPerMinute:    prometheus.NewDesc("average_contracts_saved_per_minute", "", nil, labels),
		ContractsSaved:                    prometheus.NewDesc("contracts_saved", "", nil, labels),

		// Redis publisher
		RedisPublishErrors:     make([]*prometheus.Desc, len(config.Redis)),
		RedisPersistentErrors:  make([]*prometheus.Desc, len(config.Redis)),
		RedisMessagesPublished: make([]*prometheus.Desc, len(config.Redis)),
		RedisPoolHits:          make([]*prometheus.Desc, len(config.Redis)),
		RedisPoolIdleConns:     make([]*prometheus.Desc, len(config.Redis)),
		RedisPoolMisses:        make([]*prometheus.Desc, len(config.Redis)),
		RedisPoolStaleConns:    make([]*prometheus.Desc, len(config.Redis)),
		RedisPoolTimeouts:      make([]*prometheus.Desc, len(config.Redis)),
		RedisPoolTotalConns:    make([]*prometheus.Desc, len(config.Redis)),

		// App sync publisher
		AppSyncPublishErrors:     prometheus.NewDesc("error_app_sync_publish", "", nil, labels),
		AppSyncPersistentErrors:  prometheus.NewDesc("error_app_sync_persistent", "", nil, labels),
		AppSyncMessagesPublished: prometheus.NewDesc("app_sync_messages_published", "", nil, labels),
	}

	for i := range config.Redis {
		// Redis publisher
		collector.RedisPublishErrors[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_publish_errors", i), "", nil, nil)
		collector.RedisPersistentErrors[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_persistent_errors", i), "", nil, nil)
		collector.RedisMessagesPublished[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_messages_published", i), "", nil, nil)
		collector.RedisPoolHits[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_pool_hits", i), "", nil, nil)
		collector.RedisPoolIdleConns[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_pool_idle_conns", i), "", nil, nil)
		collector.RedisPoolMisses[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_pool_misses", i), "", nil, nil)
		collector.RedisPoolStaleConns[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_pool_stale_conns", i), "", nil, nil)
		collector.RedisPoolTimeouts[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_pool_timeouts", i), "", nil, nil)
		collector.RedisPoolTotalConns[i] = prometheus.NewDesc(fmt.Sprintf("redis_%d_pool_total_conns", i), "", nil, nil)
	}

	return collector
}

func (self *Collector) WithMonitor(m *Monitor) *Collector {
	self.monitor = m
	return self
}

func (self *Collector) Describe(ch chan<- *prometheus.Desc) {
	ch <- self.ArweaveCurrentHeight
	ch <- self.ArweaveLastNetworkInfoTimestamp
	ch <- self.StartTimestamp
	ch <- self.UpForSeconds
	ch <- self.BlocksBehind
	ch <- self.AverageBlocksProcessedPerMinute
	ch <- self.AverageTransactionDownloadedPerMinute
	ch <- self.PeersBlacklisted
	ch <- self.NumPeers
	ch <- self.TransactionsDownloaded
	ch <- self.NumWatchdogRestarts

	// Errors
	ch <- self.DbLastTransactionBlockHeightError
	ch <- self.TxValidationErrors
	ch <- self.TxDownloadErrors
	ch <- self.TxPermanentDownloadErrors
	ch <- self.BlockValidationErrors
	ch <- self.BlockDownloadErrors
	ch <- self.PeerDownloadErrors
	ch <- self.NetworkInfoDownloadErrors

	// Contractor
	ch <- self.DbContractInsertError
	ch <- self.DbSourceError
	ch <- self.DbLastTransactionBlockHeightError
	ch <- self.LoadPersistentContractError
	ch <- self.LoadContractError
	ch <- self.LoadSourceError
	ch <- self.LoadInitStateError
	ch <- self.FinishedHeight
	ch <- self.AverageContractsSavedPerMinute
	ch <- self.ContractsSaved

	// Redis publisher
	for i := range self.monitor.Report.RedisPublishers {
		ch <- self.RedisPublishErrors[i]
		ch <- self.RedisPersistentErrors[i]
		ch <- self.RedisMessagesPublished[i]
		ch <- self.RedisPoolHits[i]
		ch <- self.RedisPoolIdleConns[i]
		ch <- self.RedisPoolMisses[i]
		ch <- self.RedisPoolStaleConns[i]
		ch <- self.RedisPoolTimeouts[i]
		ch <- self.RedisPoolTotalConns[i]
	}
	// App sync publisher
	ch <- self.AppSyncPublishErrors
	ch <- self.AppSyncPersistentErrors
	ch <- self.AppSyncMessagesPublished
}

// Collect implements required collect function for all promehteus collectors
func (self *Collector) Collect(ch chan<- prometheus.Metric) {
	ch <- prometheus.MustNewConstMetric(self.ArweaveCurrentHeight, prometheus.GaugeValue, float64(self.monitor.Report.NetworkInfo.State.ArweaveCurrentHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.ArweaveLastNetworkInfoTimestamp, prometheus.GaugeValue, float64(self.monitor.Report.NetworkInfo.State.ArweaveLastNetworkInfoTimestamp.Load()))
	ch <- prometheus.MustNewConstMetric(self.StartTimestamp, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.StartTimestamp.Load()))
	ch <- prometheus.MustNewConstMetric(self.UpForSeconds, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.UpForSeconds.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlocksBehind, prometheus.GaugeValue, float64(self.monitor.Report.BlockDownloader.State.BlocksBehind.Load()))
	ch <- prometheus.MustNewConstMetric(self.AverageBlocksProcessedPerMinute, prometheus.GaugeValue, float64(self.monitor.Report.BlockDownloader.State.AverageBlocksProcessedPerMinute.Load()))

	// Errors
	ch <- prometheus.MustNewConstMetric(self.NetworkInfoDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.NetworkInfo.Errors.NetworkInfoDownloadErrors.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlockValidationErrors, prometheus.CounterValue, float64(self.monitor.Report.BlockDownloader.Errors.BlockValidationErrors.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlockDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.BlockDownloader.Errors.BlockDownloadErrors.Load()))

	// Run
	ch <- prometheus.MustNewConstMetric(self.NumWatchdogRestarts, prometheus.CounterValue, float64(self.monitor.Report.Run.Errors.NumWatchdogRestarts.Load()))

	// TransactionDownloader
	ch <- prometheus.MustNewConstMetric(self.TransactionsDownloaded, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.State.TransactionsDownloaded.Load()))
	ch <- prometheus.MustNewConstMetric(self.AverageTransactionDownloadedPerMinute, prometheus.GaugeValue, float64(self.monitor.Report.TransactionDownloader.State.AverageTransactionDownloadedPerMinute.Load()))
	ch <- prometheus.MustNewConstMetric(self.TxPermanentDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.Errors.PermanentDownloadFailure.Load()))
	ch <- prometheus.MustNewConstMetric(self.TxDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.Errors.Download.Load()))
	ch <- prometheus.MustNewConstMetric(self.TxValidationErrors, prometheus.CounterValue, float64(self.monitor.Report.TransactionDownloader.Errors.Validation.Load()))

	// PeerMonitor
	ch <- prometheus.MustNewConstMetric(self.PeersBlacklisted, prometheus.GaugeValue, float64(self.monitor.Report.Peer.State.PeersBlacklisted.Load()))
	ch <- prometheus.MustNewConstMetric(self.NumPeers, prometheus.GaugeValue, float64(self.monitor.Report.Peer.State.NumPeers.Load()))
	ch <- prometheus.MustNewConstMetric(self.PeerDownloadErrors, prometheus.CounterValue, float64(self.monitor.Report.Peer.Errors.PeerDownloadErrors.Load()))

	// Contractor
	ch <- prometheus.MustNewConstMetric(self.DbContractInsertError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.DbContractInsert.Load()))
	ch <- prometheus.MustNewConstMetric(self.DbSourceError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.DbSourceInsert.Load()))
	ch <- prometheus.MustNewConstMetric(self.DbLastTransactionBlockHeightError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.DbLastTransactionBlockHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.LoadPersistentContractError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.LoadPersistentContract.Load()))
	ch <- prometheus.MustNewConstMetric(self.LoadContractError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.LoadContract.Load()))
	ch <- prometheus.MustNewConstMetric(self.LoadSourceError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.LoadSource.Load()))
	ch <- prometheus.MustNewConstMetric(self.LoadInitStateError, prometheus.CounterValue, float64(self.monitor.Report.Contractor.Errors.LoadInitState.Load()))
	ch <- prometheus.MustNewConstMetric(self.FinishedHeight, prometheus.GaugeValue, float64(self.monitor.Report.Contractor.State.FinishedHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.AverageContractsSavedPerMinute, prometheus.CounterValue, float64(self.monitor.Report.Contractor.State.AverageContractsSavedPerMinute.Load()))
	ch <- prometheus.MustNewConstMetric(self.ContractsSaved, prometheus.CounterValue, float64(self.monitor.Report.Contractor.State.ContractsSaved.Load()))

	// Redis publisher
	for i, redisPublisher := range self.monitor.Report.RedisPublishers {
		ch <- prometheus.MustNewConstMetric(self.RedisPublishErrors[i], prometheus.CounterValue, float64(redisPublisher.Errors.Publish.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPersistentErrors[i], prometheus.CounterValue, float64(redisPublisher.Errors.PersistentFailure.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisMessagesPublished[i], prometheus.CounterValue, float64(redisPublisher.State.MessagesPublished.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPoolHits[i], prometheus.GaugeValue, float64(redisPublisher.State.PoolHits.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPoolIdleConns[i], prometheus.GaugeValue, float64(redisPublisher.State.PoolIdleConns.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPoolMisses[i], prometheus.GaugeValue, float64(redisPublisher.State.PoolMisses.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPoolStaleConns[i], prometheus.GaugeValue, float64(redisPublisher.State.PoolStaleConns.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPoolTimeouts[i], prometheus.GaugeValue, float64(redisPublisher.State.PoolTimeouts.Load()))
		ch <- prometheus.MustNewConstMetric(self.RedisPoolTotalConns[i], prometheus.GaugeValue, float64(redisPublisher.State.PoolTotalConns.Load()))
	}
	// App sync publisher
	ch <- prometheus.MustNewConstMetric(self.AppSyncPublishErrors, prometheus.CounterValue, float64(self.monitor.Report.AppSyncPublisher.Errors.Publish.Load()))
	ch <- prometheus.MustNewConstMetric(self.AppSyncPersistentErrors, prometheus.CounterValue, float64(self.monitor.Report.AppSyncPublisher.Errors.PersistentFailure.Load()))
	ch <- prometheus.MustNewConstMetric(self.AppSyncMessagesPublished, prometheus.CounterValue, float64(self.monitor.Report.AppSyncPublisher.State.MessagesPublished.Load()))
}
