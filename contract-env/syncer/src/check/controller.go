package check

import (
	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/bundlr"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/listener"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	monitor_checker "github.com/warp-contracts/syncer/src/utils/monitoring/checker"
	"github.com/warp-contracts/syncer/src/utils/task"
)

type Controller struct {
	*task.Task
}

// Main class that orchestrates everything
func NewController(config *config.Config) (self *Controller, err error) {
	self = new(Controller)
	self.Task = task.NewTask(config, "checker-controller")

	// SQL database
	db, err := model.NewConnection(self.Ctx, config, "checker")
	if err != nil {
		return
	}

	// Arweave client
	client := arweave.NewClient(self.Ctx, config)

	// Monitoring
	monitor := monitor_checker.NewMonitor()

	server := monitoring.NewServer(config).
		WithMonitor(monitor)

	// Bundlr client
	bundlrClient := bundlr.NewClient(self.Ctx, &config.Bundlr)

	// Gets network height from WARP's GW
	networkMonitor := listener.NewNetworkMonitor(config).
		WithClient(client).
		WithInterval(config.NetworkMonitor.Period).
		WithMonitor(monitor).
		WithEnableOutput(false /*disable output channel to avoid blocking*/).
		WithRequiredConfirmationBlocks(0)

		// Gets interactions that may be finalized from the db
	poller := NewPoller(config).
		WithDB(db).
		WithNetworkMonitor(networkMonitor).
		WithMonitor(monitor)

	// Checks if bundlr finalized the bundle
	checker := NewChecker(config).
		WithClient(bundlrClient).
		WithInputChannel(poller.Output).
		WithMonitor(monitor)

	// Updates states of the finalized
	store := NewStore(config).
		WithDB(db).
		WithInputChannel(checker.Output).
		WithMonitor(monitor)

	// Setup everything, will start upon calling Controller.Start()
	self.Task.
		WithSubtask(server.Task).
		WithSubtask(store.Task).
		WithSubtask(networkMonitor.Task).
		WithSubtask(monitor.Task).
		WithSubtask(poller.Task).
		WithSubtask(checker.Task)
	return
}
