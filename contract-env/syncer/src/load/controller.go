package load

import (
	"time"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/listener"
	"github.com/warp-contracts/syncer/src/utils/model"
	monitor_syncer "github.com/warp-contracts/syncer/src/utils/monitoring/syncer"
	"github.com/warp-contracts/syncer/src/utils/task"
)

type Controller struct {
	*task.Task
}

// Main class that orchestrates functionalities
func NewController(config *config.Config) (self *Controller, err error) {
	self = new(Controller)
	self.Task = task.NewTask(config, "loader-controller")

	// SQL database
	db, err := model.NewConnection(self.Ctx, config, "bundle-load-test")
	if err != nil {
		return
	}

	// Dummy monitor, not used, but needed

	// Arweave client
	client := arweave.NewClient(self.Ctx, config)

	networkMonitor := listener.NewNetworkMonitor(config).
		WithClient(client).
		WithMonitor(monitor_syncer.NewMonitor() /*dummy monitor */).
		WithInterval(30 * time.Second).
		WithRequiredConfirmationBlocks(0)

	// Downloading the latest Arweave block
	blockDownloader := NewBlockDownloader(config).
		WithClient(client).
		WithInputChannel(networkMonitor.Output)

	// Generates fake transactions
	generator := NewGenerator(config)

	// Parses transaction into Payload
	parser := NewParser(config).
		WithBlockDownloader(blockDownloader).
		WithInputChannel(generator.Output)

	// Saves bundles
	store := NewStore(config).
		WithDB(db).
		WithInputChannel(parser.Output)

	// Setup everything, will start upon calling Controller.Start()
	self.Task.
		WithSubtask(networkMonitor.Task).
		WithSubtask(blockDownloader.Task).
		WithSubtask(generator.Task).
		WithSubtask(parser.Task).
		WithSubtask(store.Task)
	return
}
