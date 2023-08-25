package monitor_syncer

import (
	"math"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/warp-contracts/syncer/src/utils/monitoring/report"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/gammazero/deque"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

// Stores and computes monitor counters
type Monitor struct {
	*task.Task

	mtx         sync.RWMutex
	Report      report.Report
	historySize int
	collector   *Collector

	// Block processing speed
	BlockHeights      *deque.Deque[int64]
	TransactionCounts *deque.Deque[uint64]
	InteractionsSaved *deque.Deque[uint64]

	// Params
	IsFatalError atomic.Bool
}

func NewMonitor() (self *Monitor) {
	self = new(Monitor)

	self.Report = report.Report{
		Run:                   &report.RunReport{},
		Syncer:                &report.SyncerReport{},
		NetworkInfo:           &report.NetworkInfoReport{},
		BlockDownloader:       &report.BlockDownloaderReport{},
		TransactionDownloader: &report.TransactionDownloaderReport{},
		Peer:                  &report.PeerReport{},
	}

	// Initialization
	self.Report.Run.State.StartTimestamp.Store(time.Now().Unix())

	self.collector = NewCollector().WithMonitor(self)

	self.Task = task.NewTask(nil, "monitor").
		WithPeriodicSubtaskFunc(30*time.Second, self.monitor).
		WithPeriodicSubtaskFunc(time.Minute, self.monitorBlocks).
		WithPeriodicSubtaskFunc(time.Minute, self.monitorTransactions).
		WithPeriodicSubtaskFunc(time.Minute, self.monitorInteractions)
	return
}

func (self *Monitor) Clear() {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	self.BlockHeights.Clear()
	self.TransactionCounts.Clear()
	self.InteractionsSaved.Clear()
}

func (self *Monitor) GetReport() *report.Report {
	return &self.Report
}

func (self *Monitor) WithMaxHistorySize(maxHistorySize int) *Monitor {
	self.historySize = maxHistorySize

	self.BlockHeights = deque.New[int64](self.historySize)
	self.TransactionCounts = deque.New[uint64](self.historySize)
	self.InteractionsSaved = deque.New[uint64](self.historySize)

	return self
}

func (self *Monitor) GetPrometheusCollector() (collector prometheus.Collector) {
	return self.collector
}

func round(f float64) float64 {
	return math.Round(f*100) / 100
}

// Measure block processing speed
func (self *Monitor) monitorBlocks() (err error) {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	loaded := self.Report.BlockDownloader.State.CurrentHeight.Load()
	if loaded == 0 {
		// Neglect the first 0
		return
	}

	self.BlockHeights.PushBack(loaded)
	if self.BlockHeights.Len() > self.historySize {
		self.BlockHeights.PopFront()
	}
	value := float64(self.BlockHeights.Back()-self.BlockHeights.Front()) / float64(self.BlockHeights.Len())

	self.Report.BlockDownloader.State.AverageBlocksProcessedPerMinute.Store(round(value))
	return
}

// Measure transaction processing speed
func (self *Monitor) monitorTransactions() (err error) {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	loaded := self.Report.TransactionDownloader.State.TransactionsDownloaded.Load()
	if loaded == 0 {
		// Neglect the first 0
		return
	}

	self.TransactionCounts.PushBack(loaded)
	if self.TransactionCounts.Len() > self.historySize {
		self.TransactionCounts.PopFront()
	}
	value := float64(self.TransactionCounts.Back()-self.TransactionCounts.Front()) / float64(self.TransactionCounts.Len())
	self.Report.TransactionDownloader.State.AverageTransactionDownloadedPerMinute.Store(round(value))
	return
}

// Measure Interaction processing speed
func (self *Monitor) monitorInteractions() (err error) {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	loaded := self.Report.Syncer.State.InteractionsSaved.Load()
	if loaded == 0 {
		// Neglect the first 0
		return
	}

	self.InteractionsSaved.PushBack(loaded)
	if self.InteractionsSaved.Len() > self.historySize {
		self.InteractionsSaved.PopFront()
	}
	value := float64(self.InteractionsSaved.Back()-self.InteractionsSaved.Front()) / float64(self.InteractionsSaved.Len())
	self.Report.Syncer.State.AverageInteractionsSavedPerMinute.Store(round(value))
	return
}

func (self *Monitor) SetPermanentError(err error) {
	self.IsFatalError.Store(true)
	self.Log.WithError(err).Error("Unrecoverable, permanent error. Monitor will ask for a restart. It may take few minutes.")
}

func (self *Monitor) IsOK() bool {
	if self.IsFatalError.Load() {
		return false
	}

	self.mtx.RLock()
	defer self.mtx.RUnlock()

	if self.BlockHeights.Len() < self.historySize {
		return true
	}

	if int64(self.Report.NetworkInfo.State.ArweaveCurrentHeight.Load())-1 <= self.Report.BlockDownloader.State.CurrentHeight.Load() {
		// It's not behind, so it's OK
		return true
	}

	// Syncer is operational long enough, check stats
	return self.Report.BlockDownloader.State.AverageBlocksProcessedPerMinute.Load() > 0.1
}

func (self *Monitor) monitor() (err error) {
	self.Report.BlockDownloader.State.BlocksBehind.Store(int64(self.Report.NetworkInfo.State.ArweaveCurrentHeight.Load()) - self.Report.BlockDownloader.State.CurrentHeight.Load())
	self.Report.Run.State.UpForSeconds.Store(uint64(time.Now().Unix() - self.Report.Run.State.StartTimestamp.Load()))
	return nil
}

func (self *Monitor) OnGetState(c *gin.Context) {
	c.JSON(http.StatusOK, &self.Report)
}

func (self *Monitor) OnGetHealth(c *gin.Context) {
	if self.IsOK() {
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusServiceUnavailable)
	}
}
