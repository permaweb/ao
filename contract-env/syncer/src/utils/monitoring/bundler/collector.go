package monitor_bundler

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Collector struct {
	monitor *Monitor

	// Run
	UpForSeconds *prometheus.Desc

	PendingBundleItems          *prometheus.Desc
	BundlesFromNotifications    *prometheus.Desc
	AdditionalFetches           *prometheus.Desc
	BundlesFromSelects          *prometheus.Desc
	RetriedBundlesFromSelects   *prometheus.Desc
	AllBundlesFromDb            *prometheus.Desc
	BundlrSuccess               *prometheus.Desc
	ConfirmationsSavedToDb      *prometheus.Desc
	BundrlError                 *prometheus.Desc
	BundrlMarshalError          *prometheus.Desc
	ConfirmationsSavedToDbError *prometheus.Desc
	AdditionalFetchError        *prometheus.Desc
	PollerFetchError            *prometheus.Desc
}

func NewCollector() *Collector {
	return &Collector{
		UpForSeconds:                prometheus.NewDesc("up_for_seconds", "", nil, nil),
		PendingBundleItems:          prometheus.NewDesc("pending_bundle_items", "", nil, nil),
		BundlesFromNotifications:    prometheus.NewDesc("bundles_from_notifications", "", nil, nil),
		AdditionalFetches:           prometheus.NewDesc("additional_fetches", "", nil, nil),
		BundlesFromSelects:          prometheus.NewDesc("bundles_from_selects", "", nil, nil),
		RetriedBundlesFromSelects:   prometheus.NewDesc("retried_bundles_from_selects", "", nil, nil),
		AllBundlesFromDb:            prometheus.NewDesc("all_bundles_from_db", "", nil, nil),
		BundlrSuccess:               prometheus.NewDesc("bundlr_success", "", nil, nil),
		ConfirmationsSavedToDb:      prometheus.NewDesc("confirmations_saved_to_db", "", nil, nil),
		BundrlError:                 prometheus.NewDesc("bundrl_error", "", nil, nil),
		BundrlMarshalError:          prometheus.NewDesc("bundrl_marshal_error", "", nil, nil),
		ConfirmationsSavedToDbError: prometheus.NewDesc("confirmations_saved_to_db_error", "", nil, nil),
		AdditionalFetchError:        prometheus.NewDesc("additional_fetch_error", "", nil, nil),
		PollerFetchError:            prometheus.NewDesc("poller_fetch_error", "", nil, nil),
	}
}

func (self *Collector) WithMonitor(m *Monitor) *Collector {
	self.monitor = m
	return self
}

func (self *Collector) Describe(ch chan<- *prometheus.Desc) {
	// Run
	ch <- self.UpForSeconds

	ch <- self.PendingBundleItems
	ch <- self.BundlesFromNotifications
	ch <- self.BundlesFromSelects
	ch <- self.RetriedBundlesFromSelects
	ch <- self.AdditionalFetches
	ch <- self.AllBundlesFromDb
	ch <- self.BundlrSuccess
	ch <- self.ConfirmationsSavedToDb

	// Errors
	ch <- self.BundrlError
	ch <- self.ConfirmationsSavedToDbError
	ch <- self.AdditionalFetchError
	ch <- self.PollerFetchError
}

// Collect implements required collect function for all promehteus collectors
func (self *Collector) Collect(ch chan<- prometheus.Metric) {
	// Run
	ch <- prometheus.MustNewConstMetric(self.UpForSeconds, prometheus.GaugeValue, float64(self.monitor.Report.Run.State.UpForSeconds.Load()))

	// Bundler
	ch <- prometheus.MustNewConstMetric(self.PendingBundleItems, prometheus.GaugeValue, float64(self.monitor.Report.Bundler.State.PendingBundleItems.Load()))
	ch <- prometheus.MustNewConstMetric(self.BundlesFromNotifications, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.BundlesFromNotifications.Load()))
	ch <- prometheus.MustNewConstMetric(self.AdditionalFetches, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.AdditionalFetches.Load()))
	ch <- prometheus.MustNewConstMetric(self.BundlesFromSelects, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.BundlesFromSelects.Load()))
	ch <- prometheus.MustNewConstMetric(self.RetriedBundlesFromSelects, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.RetriedBundlesFromSelects.Load()))
	ch <- prometheus.MustNewConstMetric(self.AllBundlesFromDb, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.AllBundlesFromDb.Load()))
	ch <- prometheus.MustNewConstMetric(self.BundlrSuccess, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.BundlrSuccess.Load()))
	ch <- prometheus.MustNewConstMetric(self.ConfirmationsSavedToDb, prometheus.CounterValue, float64(self.monitor.Report.Bundler.State.ConfirmationsSavedToDb.Load()))
	ch <- prometheus.MustNewConstMetric(self.BundrlError, prometheus.CounterValue, float64(self.monitor.Report.Bundler.Errors.BundrlError.Load()))
	ch <- prometheus.MustNewConstMetric(self.BundrlMarshalError, prometheus.CounterValue, float64(self.monitor.Report.Bundler.Errors.BundrlMarshalError.Load()))
	ch <- prometheus.MustNewConstMetric(self.ConfirmationsSavedToDbError, prometheus.CounterValue, float64(self.monitor.Report.Bundler.Errors.ConfirmationsSavedToDbError.Load()))
	ch <- prometheus.MustNewConstMetric(self.AdditionalFetchError, prometheus.CounterValue, float64(self.monitor.Report.Bundler.Errors.AdditionalFetchError.Load()))
	ch <- prometheus.MustNewConstMetric(self.PollerFetchError, prometheus.CounterValue, float64(self.monitor.Report.Bundler.Errors.PollerFetchError.Load()))
}
