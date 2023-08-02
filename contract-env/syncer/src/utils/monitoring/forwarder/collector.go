package monitor_forwarder

import (
	"fmt"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/warp-contracts/syncer/src/utils/config"
)

type Collector struct {
	monitor *Monitor

	// Run
	UpForSeconds *prometheus.Desc

	// Forwarder
	FinishedHeight     *prometheus.Desc
	L1Interactions     *prometheus.Desc
	L2Interactions     *prometheus.Desc
	BlocksBehindSyncer *prometheus.Desc

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
}

func NewCollector(config *config.Config) *Collector {
	collector := &Collector{
		// Run
		UpForSeconds: prometheus.NewDesc("up_for_seconds", "", nil, nil),

		// Forwarder
		FinishedHeight:     prometheus.NewDesc("finished_height", "", nil, nil),
		L1Interactions:     prometheus.NewDesc("l1_interactions", "", nil, nil),
		L2Interactions:     prometheus.NewDesc("l2_interactions", "", nil, nil),
		BlocksBehindSyncer: prometheus.NewDesc("blocks_behind_syncer", "", nil, nil),

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
	// Run
	ch <- self.UpForSeconds

	// Forwarder
	ch <- self.FinishedHeight
	ch <- self.L1Interactions
	ch <- self.L2Interactions
	ch <- self.BlocksBehindSyncer

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
}

// Collect implements required collect function for all promehteus collectors
func (self *Collector) Collect(ch chan<- prometheus.Metric) {
	// Run
	ch <- prometheus.MustNewConstMetric(self.UpForSeconds, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.UpForSeconds.Load()))

	// Forwarder
	ch <- prometheus.MustNewConstMetric(self.FinishedHeight, prometheus.GaugeValue, float64(self.monitor.Report.Forwarder.State.FinishedHeight.Load()))
	ch <- prometheus.MustNewConstMetric(self.L1Interactions, prometheus.CounterValue, float64(self.monitor.Report.Forwarder.State.L1Interactions.Load()))
	ch <- prometheus.MustNewConstMetric(self.L2Interactions, prometheus.CounterValue, float64(self.monitor.Report.Forwarder.State.L2Interactions.Load()))
	ch <- prometheus.MustNewConstMetric(self.BlocksBehindSyncer, prometheus.GaugeValue, float64(self.monitor.Report.Forwarder.State.BlocksBehindSyncer.Load()))

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
}
