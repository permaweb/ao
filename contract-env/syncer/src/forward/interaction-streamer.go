package forward

import (
	"encoding/json"
	"errors"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/streamer"
	"github.com/warp-contracts/syncer/src/utils/task"
)

// Produces current syncer's height
type InteractionStreamer struct {
	*task.Task

	streamer *streamer.Streamer
	monitor  monitoring.Monitor

	// Current Syncer's block height
	Output chan *Payload
}

func NewInteractionStreamer(config *config.Config) (self *InteractionStreamer) {
	self = new(InteractionStreamer)

	self.Output = make(chan *Payload, config.Forwarder.InteractionsStreamerQueueSize)

	self.streamer = streamer.NewStreamer(config, "interaction-stream").
		WithNotificationChannelName("interactions").
		WithCapacity(10)

	self.Task = task.NewTask(config, "interaction").
		// Live source of interactions
		WithSubtask(self.streamer.Task).
		// Parse and pass the interaction
		WithSubtaskFunc(self.run)

	return
}

func (self *InteractionStreamer) WithMonitor(monitor monitoring.Monitor) *InteractionStreamer {
	self.monitor = monitor
	return self
}

func (self *InteractionStreamer) run() (err error) {
	for {
		select {
		case <-self.Ctx.Done():
			self.Log.Debug("Stop passing sync state")
			return nil
		case msg, ok := <-self.streamer.Output:
			if !ok {
				self.Log.Error("Streamer closed, can't receive sequencer's state changes!")
				return nil
			}

			var interaction model.Interaction
			err = json.Unmarshal([]byte(msg), &interaction)
			if err != nil {
				self.Log.WithError(err).Error("Failed to unmarshal interaction")
				self.monitor.GetReport().Forwarder.Errors.DbFetchL2Interactions.Inc()
				return
			}

			payload := &Payload{
				Interaction: &interaction,
			}

			// Pass the interaction to the output channel
			select {
			case <-self.Ctx.Done():
				return errors.New("InteractionStreamer stopped")
			case self.Output <- payload:
			}

			// Update monitoring
			self.monitor.GetReport().Forwarder.State.L2Interactions.Inc()
		}
	}
}
