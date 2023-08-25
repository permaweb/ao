package monitoring

import (
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/task"

	"go.uber.org/atomic"

	"gorm.io/gorm"
)

// Periodically performs database queries and stores in the monitor state
type DbPoller struct {
	*task.Task
	db *gorm.DB
}

type Query struct {
	Sql    string
	Atomic *atomic.Uint64
}

func NewDbPoller(config *config.Config) (self *DbPoller) {
	self = new(DbPoller)

	self.Task = task.NewTask(config, "db-poller")

	return
}

func (self *DbPoller) WithDB(db *gorm.DB) *DbPoller {
	self.db = db
	return self
}

func (self *DbPoller) WithQuery(interval time.Duration, val *atomic.Int64, sql string) *DbPoller {
	self.Task = self.Task.WithPeriodicSubtaskFunc(interval, func() error {
		var count int64
		err := self.db.WithContext(self.Ctx).
			Raw(sql).
			Row().
			Scan(&count)
		if err != nil {
			self.Log.WithError(err).Error("failed to execute query")
			return nil
		}
		(*val).Store(count)
		return nil
	})
	return self
}
