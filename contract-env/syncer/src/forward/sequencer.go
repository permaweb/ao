package forward

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/streamer"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
)

// Produces current syncer's height
type Sequencer struct {
	*task.Task
	db *gorm.DB

	streamer *streamer.Streamer
	monitor  monitoring.Monitor

	// Current Syncer's block height
	Output chan uint64

	// Current, broadcasted height
	currentHeight uint64
}

func NewSequencer(config *config.Config) (self *Sequencer) {
	self = new(Sequencer)

	self.Output = make(chan uint64)

	self.streamer = streamer.NewStreamer(config, "sequence-sync-state").
		WithNotificationChannelName("sync_state_syncer").
		WithCapacity(10)

	self.Task = task.NewTask(config, "sequencer").
		// Live source of interactions that need to be bundled
		WithSubtask(self.streamer.Task).
		// Interactions that somehow wasn't sent through the notification channel. Probably because of a restart.
		WithSubtaskFunc(self.run)

	return
}

func (self *Sequencer) WithDB(db *gorm.DB) *Sequencer {
	self.db = db
	return self
}

func (self *Sequencer) WithMonitor(monitor monitoring.Monitor) *Sequencer {
	self.monitor = monitor
	return self
}

func (self *Sequencer) run() (err error) {
	err = self.catchUp()
	if err != nil {
		self.Log.WithError(err).Debug("Failed to catch up")
		return
	}

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

			var state model.State
			err = json.Unmarshal([]byte(msg), &state)
			if err != nil {
				self.Log.WithError(err).Error("Failed to unmarshal sequencer sync state")
				return
			}

			if state.FinishedBlockHeight <= self.currentHeight {
				// There was no change, neglect
				continue
			}

			// Emit height change one by one
			err = self.emit(state.FinishedBlockHeight, false /* sleep before emitting to let outstanding GW requests finish*/)
			if err != nil {
				return
			}
		}
	}
}

func (self *Sequencer) catchUp() (err error) {
	// Get the last block height from the database
	var syncerState, forwarderState model.State

	err = self.db.WithContext(self.Ctx).
		Transaction(func(tx *gorm.DB) error {
			err = tx.WithContext(self.Ctx).
				Table(model.TableState).
				Find(&forwarderState, model.SyncedComponentForwarder).
				Error
			if err != nil {
				return err
			}
			return tx.WithContext(self.Ctx).
				Table(model.TableState).
				Find(&syncerState, model.SyncedComponentInteractions).
				Error
		})
	if err != nil {
		self.Log.WithError(err).Error("Failed to sync state for forwarder and syncer")
		return
	}

	self.Log.WithField("syncer_finished_height", syncerState.FinishedBlockHeight).
		WithField("forwarder_finished_height", forwarderState.FinishedBlockHeight).
		WithField("heigh_to_catch_up", syncerState.FinishedBlockHeight-forwarderState.FinishedBlockHeight).
		Info("Downloaded sync state. Emitting height changes...")

	// Emit height change one by one
	self.currentHeight = forwarderState.FinishedBlockHeight

	// Emitting may take a while, so we need to check if we are still in sync
	for syncerState.FinishedBlockHeight > self.currentHeight {
		err = self.emit(syncerState.FinishedBlockHeight, true /* skip sleep, we're catching up L2 interactions won't intersect anyway since they use syncer's height for sort key generation */)
		if err != nil {
			return
		}

		syncerState, err = self.getSyncerState()
		if err != nil {
			return
		}
	}

	self.Log.Info("Height changes emitted")

	return nil
}

func (self *Sequencer) getSyncerState() (state model.State, err error) {
	err = self.db.WithContext(self.Ctx).
		Table(model.TableState).
		Find(&state, model.SyncedComponentInteractions).
		Error
	return
}

func (self *Sequencer) emit(newHeight uint64, skipSleep bool) (err error) {
	for newHeight > self.currentHeight {
		if !skipSleep {
			time.Sleep(self.Config.Forwarder.HeightDelay)
		}
		// Update height that we are currently at
		self.currentHeight += 1
		self.Log.WithField("current_height", self.currentHeight).Debug("Emitting height change")
		select {
		case <-self.Ctx.Done():
			return errors.New("Sequencer stopped")
		case self.Output <- self.currentHeight:
		}

		// Update metrics
		self.monitor.GetReport().Forwarder.State.CurrentSyncerHeight.Store(newHeight)
	}
	return
}
