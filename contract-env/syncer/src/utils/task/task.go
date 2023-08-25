package task

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/warp-contracts/syncer/src/utils/common"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/gammazero/workerpool"
	"github.com/sirupsen/logrus"
)

// Boilerplate for running long lived tasks.
type Task struct {
	Config *config.Config
	Log    *logrus.Entry
	Name   string

	// Stopping
	IsStopping    *atomic.Bool
	StopChannel   chan bool
	stopOnce      *sync.Once
	stopWaitGroup sync.WaitGroup

	// Context active as long as there's anything running in the task.
	// Used OUTSIDE the task.
	CtxRunning    context.Context
	cancelRunning context.CancelFunc

	// Context cancelled when Stop() is called.
	// Used INSIDE the task
	Ctx    context.Context
	cancel context.CancelFunc

	// Workers that perform the task
	workers            *workerpool.WorkerPool
	workerQueueCond    *sync.Cond
	workerMaxQueueSize int

	// Callbacks
	onBeforeStart []func() error
	onStop        []func()
	onAfterStop   []func()
	subtasksFunc  []func() error
	subtasks      []*Task

	// Enabled
	isEnabled bool
}

func NewTask(config *config.Config, name string) (self *Task) {
	self = new(Task)
	self.Log = logger.NewSublogger(name)
	self.Name = name
	self.Config = config

	// Context cancelled when Stop() is called
	self.Ctx, self.cancel = context.WithCancel(context.Background())
	self.Ctx = common.SetConfig(self.Ctx, config)

	// Context active as long as there's anything running in the task
	self.CtxRunning, self.cancelRunning = context.WithCancel(context.Background())
	self.CtxRunning = common.SetConfig(self.Ctx, config)

	// Stopping
	self.stopOnce = &sync.Once{}
	self.IsStopping = &atomic.Bool{}
	self.stopWaitGroup = sync.WaitGroup{}
	self.StopChannel = make(chan bool, 1)

	return
}

func (self *Task) WithOnBeforeStart(f func() error) *Task {
	self.onBeforeStart = append(self.onBeforeStart, f)
	return self
}

func (self *Task) WithOnAfterStop(f func()) *Task {
	self.onAfterStop = append(self.onAfterStop, f)
	return self
}

func (self *Task) WithOnStop(f func()) *Task {
	self.onStop = append(self.onStop, f)
	return self
}

func (self *Task) WithEnable(v bool) *Task {
	self.isEnabled = v
	return self
}

func (self *Task) WithConditionalSubtask(isEnabled bool, t *Task) *Task {
	if !isEnabled {
		return self
	}
	return self.WithSubtask(t)
}

func (self *Task) WithSubtask(t *Task) *Task {
	// Ensure context will be cancelled after all kinds of subtasks finish
	t = t.WithOnBeforeStart(func() error {
		self.stopWaitGroup.Add(1)
		return nil
	}).WithOnAfterStop(func() {
		self.stopWaitGroup.Done()
	})
	self.subtasks = append(self.subtasks, t)
	return self
}

func (self *Task) WithSubtaskSlice(tasks []*Task) *Task {
	// Ensure context will be cancelled after all kinds of subtasks finish
	for _, t := range tasks {
		t = t.WithOnBeforeStart(func() error {
			self.stopWaitGroup.Add(1)
			return nil
		}).WithOnAfterStop(func() {
			self.stopWaitGroup.Done()
		})
		self.subtasks = append(self.subtasks, t)
	}
	return self
}

func (self *Task) WithSubtaskFunc(f func() error) *Task {
	self.subtasksFunc = append(self.subtasksFunc, f)
	return self
}

// Callback is run again and again until it returns false or an error. Rerun after period.
func (self *Task) WithRepeatedSubtaskFunc(period time.Duration, f func() (repeat bool, err error)) *Task {
	return self.WithPeriodicSubtaskFunc(period, func() error {
		for {
			repeat, err := f()
			if err != nil {
				return err
			}
			if !repeat {
				return nil
			}
			if self.IsStopping.Load() {
				return nil
			}
		}
	})
}

// Repeatedly run the callback with a period.
func (self *Task) WithPeriodicSubtaskFunc(period time.Duration, f func() error) *Task {
	self.subtasksFunc = append(self.subtasksFunc, func() error {
		var timer *time.Timer
		run := func() error {
			// Setup waiting before the next check
			defer func() { timer = time.NewTimer(period) }()
			return f()
		}

		var err error
		for {
			err = run()
			if err != nil {
				return err
			}

			select {
			case <-self.StopChannel:
				self.Log.Debug("Task stopped")
				return nil
			case <-timer.C:
				// pass through
			}
		}
	})
	return self
}

func (self *Task) WithWorkerPool(maxWorkers int, maxQueueSize int) *Task {
	// Queue synchronization
	var m sync.Mutex
	self.workerQueueCond = sync.NewCond(&m)
	self.workerMaxQueueSize = maxQueueSize

	// The pool
	self.workers = workerpool.New(maxWorkers)
	return self.WithOnAfterStop(func() {
		self.workers.StopWait()
		self.workerQueueCond.Broadcast()
	})
}

func (self *Task) GetWorkerQueueFillFactor() float32 {
	if self.workerMaxQueueSize == 0 {
		return 0
	}

	size := self.workers.WaitingQueueSize()
	return float32(size) / float32(self.workerMaxQueueSize)
}

func (self *Task) SubmitToWorkerIfEmpty(f func()) {
	self.workerQueueCond.L.Lock()
	defer self.workerQueueCond.L.Unlock()

	if self.workers.WaitingQueueSize() > 0 {
		return
	}

	// Submit the task
	self.workers.Submit(
		func() {
			defer func() {
				var err error
				if p := recover(); p != nil {
					switch p := p.(type) {
					case error:
						err = p
					default:
						err = fmt.Errorf("%s", p)
					}
					self.Log.WithError(err).Error("Panic in func passed to worker (if empty)")

					panic(p)
				}
			}()

			f()

			// Wake up one waiting goroutine
			self.workerQueueCond.Signal()
		},
	)
}

func (self *Task) SubmitToWorker(f func()) {
	// Wait for the worker queue length to be less than size
	self.workerQueueCond.L.Lock()
	defer self.workerQueueCond.L.Unlock()

	if self.workerMaxQueueSize > 0 {
		// Limited queue size
		for self.workers.WaitingQueueSize() > self.workerMaxQueueSize {
			// self.Log.WithField("queue_size", self.workers.WaitingQueueSize()).Debug("Worker queue is full, waiting...")
			self.workerQueueCond.Wait()
			// self.Log.WithField("queue_size", self.workers.WaitingQueueSize()).Debug("Worker queue is not full anymore!")

			// Exit if stopping
			if self.IsStopping.Load() {
				// self.workerQueueCond.L.Unlock()
				return
			}
		}
	}

	// Submit the task
	self.workers.Submit(
		func() {
			defer func() {
				var err error
				if p := recover(); p != nil {
					switch p := p.(type) {
					case error:
						err = p
					default:
						err = fmt.Errorf("%s", p)
					}
					self.Log.WithError(err).Error("Panic in func passed to worker")

					panic(p)
				}
			}()

			f()

			// Wake up one waiting goroutine
			self.workerQueueCond.Signal()
		},
	)
}

func (self *Task) run(subtask func() error) {
	self.stopWaitGroup.Add(1)
	go func() {
		defer func() {
			self.stopWaitGroup.Done()

			var err error
			if p := recover(); p != nil {
				switch p := p.(type) {
				case error:
					err = p
				default:
					err = fmt.Errorf("%s", p)
				}
				self.Log.WithError(err).Error("Panic. Stopping.")

				panic(p)
			}
		}()
		for {
			err := subtask()
			if err != nil {
				self.Log.WithError(err).Error("Subtask failed")
			}

			if self.IsStopping.Load() {
				break
			}

			self.Log.Error("Subtask func returned, but task wasn't stopped. Restarting...")
		}
	}()
}

func (self *Task) Start() (err error) {
	self.Log.Info("Starting...")
	// Run callbacks
	for _, cb := range self.onBeforeStart {
		err = cb()
		if err != nil {
			return
		}
	}

	// Start subtasks
	for _, subtask := range self.subtasks {
		err = subtask.Start()
		if err != nil {
			return
		}
	}

	// Start subtasks that are plain functions
	for _, subtask := range self.subtasksFunc {
		self.run(subtask)
	}

	// Gorouting that will cancel the context
	go func() {
		// Infinite wait, assuming all subtasks will eventually close using the StopChannel
		self.stopWaitGroup.Wait()

		// Run hooks
		for _, cb := range self.onAfterStop {
			cb()
		}

		// Inform that task doesn't run anymore
		self.cancelRunning()
	}()

	self.Log.Info("Started!")
	return nil
}

func (self *Task) Stop() {
	self.Log.Info("Stopping...")
	self.stopOnce.Do(func() {
		// Stop subtasks
		for _, subtask := range self.subtasks {
			subtask.Stop()
		}

		// Signals that we're stopping
		close(self.StopChannel)

		// Inform child context that we're stopping
		self.cancel()

		// Mark that we're stopping
		self.IsStopping.Store(true)

		// Run hooks
		for _, cb := range self.onStop {
			cb()
		}
	})
}

func (self *Task) StopWait() {
	// Wait for at most 30s before force-closing
	ctx, cancel := context.WithTimeout(context.Background(), self.Config.StopTimeout)
	defer cancel()

	self.Stop()

	select {
	case <-ctx.Done():
		self.Log.Error("Timeout reached, failed to stop")
	case <-self.CtxRunning.Done():
		self.Log.Info("Task finished")
	}

	self.Log.Info("Stopped")

}
