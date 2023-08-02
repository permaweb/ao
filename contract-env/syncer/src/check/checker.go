package check

import (
	"github.com/warp-contracts/syncer/src/utils/bundlr"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"
)

// Periodically gets the current network height from warp's GW and confirms bundle is FINALIZED
type Checker struct {
	*task.Task
	monitor monitoring.Monitor

	// Communication with bundlr
	bundlrClient *bundlr.Client

	// Interactions that can be checked
	input chan *Payload

	// Finalized interactions
	Output chan int
}

// Receives bundles that can be checked in bundlr
func NewChecker(config *config.Config) (self *Checker) {
	self = new(Checker)

	self.Output = make(chan int)

	self.Task = task.NewTask(config, "checker").
		WithSubtaskFunc(self.run).
		WithWorkerPool(config.Checker.WorkerPoolSize, config.Checker.WorkerQueueSize)

	return
}

func (self *Checker) WithClient(client *bundlr.Client) *Checker {
	self.bundlrClient = client
	return self
}

func (self *Checker) WithInputChannel(input chan *Payload) *Checker {
	self.input = input
	return self
}

func (self *Checker) WithMonitor(monitor monitoring.Monitor) *Checker {
	self.monitor = monitor
	return self
}

func (self *Checker) run() error {
	// Blocks waiting for the next network height
	// Quits when the channel is closed
	for payload := range self.input {
		self.Log.WithField("id", payload.BundlerTxId).Debug("Got bundle to check")

		// Update monitoring
		self.monitor.GetReport().Checker.State.AllCheckedBundles.Inc()

		payload := payload

		self.SubmitToWorker(func() {
			self.Log.WithField("id", payload.BundlerTxId).Debug("Checking status")
			// Check if the bundle is finalized
			status, err := self.bundlrClient.GetStatus(self.Ctx, payload.BundlerTxId)
			if err != nil {
				// Update monitoring
				self.monitor.GetReport().Checker.Errors.BundrlGetStatusError.Inc()
				self.Log.WithField("interaction_id", payload.InteractionId).WithError(err).Error("Failed to get bundle status")
				return
			}

			if status.Status != "FINALIZED" {
				// Update monitoring
				self.monitor.GetReport().Checker.State.UnfinishedBundles.Inc()
				return
			}

			// Update monitoring
			self.monitor.GetReport().Checker.State.FinishedBundles.Inc()

			select {
			case <-self.Ctx.Done():
				return
			case self.Output <- payload.InteractionId:
			}

		})
	}

	return nil
}
