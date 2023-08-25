package forward

import (
	"fmt"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	monitor_forwarder "github.com/warp-contracts/syncer/src/utils/monitoring/forwarder"
	"github.com/warp-contracts/syncer/src/utils/publisher"
	"github.com/warp-contracts/syncer/src/utils/task"
)

type Controller struct {
	*task.Task
}

func NewController(config *config.Config) (self *Controller, err error) {
	self = new(Controller)
	self.Task = task.NewTask(config, "forwarder")

	// SQL database
	db, err := model.NewConnection(self.Ctx, config, "forwarder")
	if err != nil {
		return
	}

	// Monitoring
	monitor := monitor_forwarder.NewMonitor(config)
	server := monitoring.NewServer(config).
		WithMonitor(monitor)

	// Block height changes from sequencer
	sequencer := NewSequencer(config).
		WithMonitor(monitor).
		WithDB(db)

	// Fetches L1 interactions from the DB every time the block height changes
	fetcher := NewArweaveFetcher(config).
		WithDB(db).
		WithMonitor(monitor).
		WithInputChannel(sequencer.Output)

	// Gets L2 interactions (just the needed fields) through Postgres notifications, parses and passes further
	interactionStreamer := NewInteractionStreamer(config).
		WithMonitor(monitor)

	// Joins L1 and L2 interactions.
	// L1 interactions take over the output chanel
	joiner := task.NewJoiner[*Payload](config, "l1-l2-joiner").
		WithInputChannel(fetcher.Output).
		WithInputChannel(interactionStreamer.Output)

	// Publish to all redis instances
	redisMapper := redisMapper(config).
		WithInputChannel(joiner.Output)

	watched := func() *task.Task {
		redisDuplicator := task.NewDuplicator[*model.InteractionNotification](config, "redis-duplicator").
			WithOutputChannels(len(config.Redis), 0).
			WithInputChannel(redisMapper.Output)

		redisPublishers := make([]*task.Task, 0, len(config.Redis))
		for i := range config.Redis {
			redisPublisher := publisher.NewRedisPublisher[*model.InteractionNotification](config, config.Redis[i], fmt.Sprintf("interaction-redis-publisher-%d", i)).
				WithChannelName(config.Forwarder.PublisherRedisChannelName).
				WithMonitor(monitor, i).
				WithDiscardWhenDisconnected(true).
				WithInputChannel(redisDuplicator.NextChannel())
			redisPublishers = append(redisPublishers, redisPublisher.Task)
		}

		return task.NewTask(config, "watched").
			WithSubtask(redisDuplicator.Task).
			WithSubtaskSlice(redisPublishers)
	}

	watchdog := task.NewWatchdog(config).
		WithTask(watched).
		WithIsOK(30*time.Second, func() bool {
			isOK := monitor.IsOK()
			if !isOK {
				monitor.Clear()
				monitor.GetReport().Run.Errors.NumWatchdogRestarts.Inc()
			}
			return isOK
		})

	// Setup everything, will start upon calling Controller.Start()
	self.Task.
		WithSubtask(sequencer.Task).
		WithSubtask(monitor.Task).
		WithSubtask(joiner.Task).
		WithSubtask(redisMapper.Task).
		WithSubtask(fetcher.Task).
		WithSubtask(watchdog.Task).
		WithSubtask(interactionStreamer.Task).
		WithSubtask(server.Task)
	return
}
