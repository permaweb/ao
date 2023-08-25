package task

import (
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
)

type Watchdog struct {
	*Task

	constructor func() *Task

	watchedTask *Task
	isOK        func() bool
}

func NewWatchdog(config *config.Config) (self *Watchdog) {
	self = new(Watchdog)

	self.Task = NewTask(config, "watchdog").
		WithPeriodicSubtaskFunc(10*time.Second, self.runPeriodic).
		WithOnBeforeStart(func() error {
			return self.watchedTask.Start()
		}).
		WithOnStop(func() {
			self.watchedTask.StopWait()
		})

	return
}

func (self *Watchdog) WithTask(f func() *Task) *Watchdog {
	self.constructor = f
	self.watchedTask = f()
	return self
}

func (self *Watchdog) WithIsOK(interval time.Duration, isOK func() bool) *Watchdog {
	self.isOK = isOK
	self.Task.WithPeriodicSubtaskFunc(interval, self.runPeriodic)
	return self
}

func (self *Watchdog) WithOnAfterStop(onAfterStop func()) *Watchdog {
	self.Task.WithOnAfterStop(onAfterStop)
	return self
}

func (self *Watchdog) runPeriodic() (err error) {
	if self.isOK() {
		return
	}
	self.Log.Warn("Watched task is not running, restarting")
	self.watchedTask.StopWait()

	self.Log.Warn("Watched task stopped, constructing again")
	self.watchedTask = self.constructor()

	self.Log.Warn("Watched task recreated, starting")
	err = self.watchedTask.Start()
	if err != nil {
		self.Log.WithError(err).Error("Failed to restart watched task")
		panic(err)
	}
	self.Log.Warn("Watched task started")
	return
}
