package check

import (
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
)

// Periodically saves the states
// SinkTask handles caching data and periodically calling flush function
type Store struct {
	*task.SinkTask[int]
	db      *gorm.DB
	monitor monitoring.Monitor
}

func NewStore(config *config.Config) (self *Store) {
	self = new(Store)

	self.SinkTask = task.NewSinkTask[int](config, "store").
		WithOnFlush(5*time.Second, self.save).
		WithBatchSize(50).
		WithBackoff(10*time.Minute, 10*time.Second)

	return
}

func (self *Store) WithDB(db *gorm.DB) *Store {
	self.db = db
	return self
}

func (self *Store) WithInputChannel(input chan int) *Store {
	self.SinkTask = self.SinkTask.WithInputChannel(input)
	return self
}

func (self *Store) WithMonitor(monitor monitoring.Monitor) *Store {
	self.monitor = monitor
	return self
}

func (self *Store) save(ids []int) error {
	if len(ids) == 0 {
		return nil
	}
	self.Log.WithField("len", len(ids)).Debug("Saving checked states")

	err := self.db.Model(&model.BundleItem{}).
		Where("interaction_id IN ?", ids).
		Update("state", model.BundleStateOnArweave).
		Error
	if err != nil {
		self.Log.WithError(err).Error("Failed to update bundle state")

		// Update monitoring
		self.monitor.GetReport().Checker.Errors.DbStateUpdateError.Inc()
		return err
	}

	// Update monitoring
	self.monitor.GetReport().Checker.State.DbStateUpdated.Inc()

	return nil
}
