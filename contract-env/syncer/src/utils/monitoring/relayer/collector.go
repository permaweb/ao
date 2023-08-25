package monitor_relayer

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/warp-contracts/syncer/src/utils/config"
)

type Collector struct {
	monitor *Monitor

	// Run
	UpForSeconds *prometheus.Desc

	// Relayer
	BlocksReceived *prometheus.Desc
}

func NewCollector(config *config.Config) *Collector {
	collector := &Collector{
		// Run
		UpForSeconds: prometheus.NewDesc("up_for_seconds", "", nil, nil),

		// Relayer
		BlocksReceived: prometheus.NewDesc("blocks_received", "", nil, nil),
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

	// Relayer
	ch <- self.BlocksReceived

}

// Collect implements required collect function for all promehteus collectors
func (self *Collector) Collect(ch chan<- prometheus.Metric) {
	// Run
	ch <- prometheus.MustNewConstMetric(self.UpForSeconds, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.UpForSeconds.Load()))

	// Forwarder
	ch <- prometheus.MustNewConstMetric(self.BlocksReceived, prometheus.GaugeValue, float64(self.monitor.Report.Relayer.State.BlocksReceived.Load()))
}
