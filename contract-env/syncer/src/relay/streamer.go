package relay

import (
	"context"
	"time"

	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	"github.com/cometbft/cometbft/types"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"
)

// Streams new blocks from the sequencer
type Streamer struct {
	*task.Task

	monitor monitoring.Monitor
	Output  chan *types.Block
	client  *rpchttp.HTTP

	// Control channels
	pauseChan  chan struct{}
	resumeChan chan struct{}
}

// Maintains a persistent websocket connection to the sequencer
// Gets new blocks through the websocket
func NewStreamer(config *config.Config) (self *Streamer) {
	self = new(Streamer)

	self.pauseChan = make(chan struct{}, 1)
	self.resumeChan = make(chan struct{}, 1)
	self.Output = make(chan *types.Block, config.Relayer.SequencerQueueSize)

	self.Task = task.NewTask(config, "new-block-streamer")

	self.Task = self.Task.
		WithOnBeforeStart(func() (err error) {
			err = self.client.Start()
			if err != nil {
				self.Log.WithError(err).Error("Failed to start websocket connection")
			}
			return
		}).
		WithOnStop(func() {
			self.Pause()

			err := self.client.Stop()
			if err != nil {
				self.Log.WithError(err).Error("Failed to stop websocket connection")
			}
		}).
		WithOnAfterStop(func() {
			close(self.Output)
		}).
		WithSubtaskFunc(self.run)

	return
}

func (self *Streamer) WithMonitor(v monitoring.Monitor) *Streamer {
	self.monitor = v
	return self
}

func (self *Streamer) WithClient(client *rpchttp.HTTP) *Streamer {
	self.client = client
	return self
}

func (self *Streamer) Pause() {
	self.pauseChan <- struct{}{}
}

func (self *Streamer) Resume() {
	self.resumeChan <- struct{}{}
}

func (self *Streamer) onResume() (out <-chan ctypes.ResultEvent, err error) {
	// Subscribe with the query
	// Query will be automatically used upon re-subscribing
	ctx, cancel := context.WithTimeout(self.Ctx, 10*time.Second)
	defer cancel()

	return self.client.Subscribe(ctx, "relayer-new-block-streamer", "tm.event='NewBlock'", 1 /* queue size */)
}

func (self *Streamer) onPause() (err error) {
	// Subscribe with the query
	// Query will be automatically used upon re-subscribing
	ctx, cancel := context.WithTimeout(self.Ctx, 10*time.Second)
	defer cancel()

	return self.client.UnsubscribeAll(ctx, "relayer-new-block-streamer")
}

func (self *Streamer) run() (err error) {
	// Streamer starts in PAUSED state
	var input <-chan ctypes.ResultEvent

	for {
		if input == nil {
			// State: PAUSED
			// Unsubscribed from events, waiting only for control messages
			select {
			case <-self.Ctx.Done():
				return
			case <-self.resumeChan:
				input, err = self.onResume()
				if err != nil {
					return
				}
			}
		} else {
			// State: RUNNING
			// Subscribed to events, waiting for new blocks and a control message to pause
			select {
			case <-self.Ctx.Done():
				return
			case <-self.pauseChan:
				err = self.onPause()
				if err != nil {
					return
				}
				// Input channel is still not nil, to receive pending data
			case data, ok := <-input:
				if !ok {
					// Most probably unsubscribed from the websocket
					self.Log.Debug("Input channel closed")
					input = nil
				}

				// Neglect other events
				event, ok := data.Data.(types.EventDataNewBlock)
				if !ok {
					self.Log.WithField("data", data).Error("Unexpected data type")
					continue
				}

				self.monitor.GetReport().Relayer.State.BlocksReceived.Inc()
				select {
				case <-self.Ctx.Done():
					return
				case self.Output <- event.Block:
				}
			}
		}
	}
}
