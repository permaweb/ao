package gateway

import (
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	monitor_gateway "github.com/warp-contracts/syncer/src/utils/monitoring/gateway"
	"github.com/warp-contracts/syncer/src/utils/task"
)

type Controller struct {
	*task.Task
}

// Main class that orchestrates everything
func NewController(config *config.Config) (self *Controller, err error) {
	self = new(Controller)
	self.Task = task.NewTask(config, "gateway-controller")

	// SQL database
	db, err := model.NewConnection(self.Ctx, config, "gateway")
	if err != nil {
		return
	}

	// Monitoring
	monitor := monitor_gateway.NewMonitor()

	server := monitoring.NewServer(config).
		WithMonitor(monitor)

	// Gateway's REST API
	rest := NewServer(config).
		WithMonitor(monitor).
		WithDB(db)

	// Setup everything, will start upon calling Controller.Start()
	self.Task.
		WithSubtask(server.Task).
		WithSubtask(rest.Task).
		WithSubtask(monitor.Task)

	return
}
