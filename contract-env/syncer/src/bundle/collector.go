package bundle

import (
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
)

// Gets the unbundled interactions and puts them on the output channel
type Collector struct {
	*task.Task

	notifier *Notifier
	poller   *Poller

	// Data about the interactions that need to be bundled
	Output chan *model.BundleItem
}

// Sets up the task of fetching interactions to be bundled
// Collects it from two sources:
// 1. Live source of interactions that need to be bundled
// 2. Interactions that somehow wasn't sent through the notification channel. Probably because of a restart.
func NewCollector(config *config.Config, db *gorm.DB) (self *Collector) {
	self = new(Collector)

	self.Output = make(chan *model.BundleItem, 100)

	self.notifier = NewNotifier(config).
		WithDB(db).
		WithOutputChannel(self.Output)

	self.poller = NewPoller(config).
		WithDB(db).
		WithOutputChannel(self.Output)

	self.Task = task.NewTask(config, "collector").
		// Live source of interactions
		WithSubtask(self.notifier.Task).
		// Polled interactions
		WithSubtask(self.poller.Task).
		WithOnAfterStop(func() {
			close(self.Output)
		})

	return
}

func (self *Collector) WithMonitor(monitor monitoring.Monitor) *Collector {
	self.notifier.WithMonitor(monitor)
	self.poller.WithMonitor(monitor)
	return self
}
