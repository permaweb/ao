package relay

import (
	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	monitor_relayer "github.com/warp-contracts/syncer/src/utils/monitoring/relayer"
	"github.com/warp-contracts/syncer/src/utils/task"
)

type Controller struct {
	*task.Task
}

func NewController(config *config.Config) (self *Controller, err error) {
	self = new(Controller)
	self.Task = task.NewTask(config, "relayer")

	// SQL database
	db, err := model.NewConnection(self.Ctx, config, "relayer")
	if err != nil {
		return
	}

	// Sequencer/Cosmos client
	sequencerClient, err := rpchttp.New(config.Relayer.SequencerUrl, "/websocket")
	if err != nil {
		return
	}

	// Monitoring
	monitor := monitor_relayer.NewMonitor(config)
	server := monitoring.NewServer(config).
		WithMonitor(monitor)

	// Events from Warp's sequencer
	streamer := NewStreamer(config).
		WithClient(sequencerClient).
		WithMonitor(monitor)
	streamer.Resume()

	// Forwards blocks from Streamer, but fills in the gaps
	source := NewSource(config).
		WithDB(db).
		WithClient(sequencerClient).
		WithInputChannel(streamer.Output)

	// Store blocks in the database, in batches
	store := NewStore(config).
		WithInputChannel(source.Output).
		WithMonitor(monitor).
		WithDB(db)

	// Setup everything, will start upon calling Controller.Start()
	self.Task.
		WithSubtask(monitor.Task).
		WithSubtask(server.Task).
		WithSubtask(source.Task).
		WithSubtask(store.Task).
		WithSubtask(streamer.Task)

	return
}
