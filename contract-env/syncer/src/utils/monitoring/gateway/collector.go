package monitor_checker

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Collector struct {
	monitor *Monitor

	// Run
	UpForSeconds *prometheus.Desc

	// Gateway
	InteractionsReturned *prometheus.Desc
	DbError              *prometheus.Desc
}

func NewCollector() *Collector {
	return &Collector{
		// Run
		UpForSeconds: prometheus.NewDesc("up_for_seconds", "", nil, nil),

		// Gateway
		InteractionsReturned: prometheus.NewDesc("interactions_returned", "", nil, nil),
		DbError:              prometheus.NewDesc("db_error", "", nil, nil),
	}
}

func (self *Collector) WithMonitor(m *Monitor) *Collector {
	self.monitor = m
	return self
}

func (self *Collector) Describe(ch chan<- *prometheus.Desc) {
	// Run
	ch <- self.UpForSeconds

	// Gateway
	ch <- self.InteractionsReturned
	ch <- self.DbError
}

// Collect implements required collect function for all promehteus collectors
func (self *Collector) Collect(ch chan<- prometheus.Metric) {
	// Run
	ch <- prometheus.MustNewConstMetric(self.UpForSeconds, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.UpForSeconds.Load()))

	// Gateway
	ch <- prometheus.MustNewConstMetric(self.InteractionsReturned, prometheus.CounterValue, float64(self.monitor.Report.Gateway.State.InteractionsReturned.Load()))
	ch <- prometheus.MustNewConstMetric(self.DbError, prometheus.CounterValue, float64(self.monitor.Report.Gateway.Errors.DbError.Load()))
}
