package monitor_forwarder

import (
	"net/http"
	"sync/atomic"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring/report"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

// Stores and computes monitor counters
type Monitor struct {
	*task.Task

	Report    report.Report
	collector *Collector

	// Params
	IsFatalError atomic.Bool
}

func NewMonitor(config *config.Config) (self *Monitor) {
	self = new(Monitor)

	self.Report = report.Report{
		Run:             &report.RunReport{},
		RedisPublishers: make([]report.RedisPublisherReport, len(config.Redis)),
		Forwarder:       &report.ForwarderReport{},
	}

	// Initialization
	self.Report.Run.State.StartTimestamp.Store(time.Now().Unix())

	self.collector = NewCollector(config).WithMonitor(self)

	self.Task = task.NewTask(nil, "monitor").
		WithPeriodicSubtaskFunc(30*time.Second, self.monitor)

	return
}

func (self *Monitor) Clear() {
}

func (self *Monitor) GetReport() *report.Report {
	return &self.Report
}

func (self *Monitor) GetPrometheusCollector() (collector prometheus.Collector) {
	return self.collector
}

func (self *Monitor) SetPermanentError(err error) {
	self.IsFatalError.Store(true)
	self.Log.WithError(err).Error("Unrecoverable, permanent error. Monitor will ask for a restart. It may take few minutes.")
}

func (self *Monitor) IsOK() bool {
	if self.IsFatalError.Load() {
		return false
	}

	now := time.Now().Unix()
	if now-self.Report.Run.State.StartTimestamp.Load() < 300 {
		// Give it 5 minutes to start
		return true
	}

	for _, redisPublisher := range self.Report.RedisPublishers {
		if now-redisPublisher.State.LastSuccessfulMessageTimestamp.Load() > 300 {
			return false
		}
	}
	return true
}

func (self *Monitor) monitor() (err error) {
	self.Report.Run.State.UpForSeconds.Store(uint64(time.Now().Unix() - self.Report.Run.State.StartTimestamp.Load()))
	return nil
}

func (self *Monitor) OnGetState(c *gin.Context) {
	self.Report.Run.State.UpForSeconds.Store(uint64(time.Now().Unix() - self.Report.Run.State.StartTimestamp.Load()))

	c.JSON(http.StatusOK, &self.Report)
}

func (self *Monitor) OnGetHealth(c *gin.Context) {
	if self.IsOK() {
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusServiceUnavailable)
	}
}
