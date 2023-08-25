package task

import (
	"math"

	"github.com/warp-contracts/syncer/src/utils/config"

	"time"

	"github.com/gammazero/deque"
)

// Store handles saving data to the database in na robust way.
// - groups incoming Interactions into batches,
// - ensures data isn't stuck even if a batch isn't big enough
// - passes the data returned by the onFlush function to the output channel
type Processor[In any, Out any] struct {
	*Task

	// Channel for the data to be processed
	input chan In

	// Called for each incoming data
	onProcess func(In) ([]Out, error)

	// Periodically called to handle a batch of processed data
	onFlush func([]Out) ([]Out, error)

	// Queue for the processed data
	queue deque.Deque[Out]

	// Batch size that will trigger the onFlush function
	batchSize int

	// Flush interval
	flushInterval time.Duration

	// Max time flush should be retried. 0 means no limit.
	maxElapsedTime time.Duration

	// Max times between flush retries
	maxInterval time.Duration

	// Output channel that forwards successfuly processed data
	Output chan []Out
}

func NewProcessor[In any, Out any](config *config.Config, name string) (self *Processor[In, Out]) {
	self = new(Processor[In, Out])

	self.Task = NewTask(config, name).
		WithSubtaskFunc(self.run)

	return
}

func (self *Processor[In, Out]) WithBatchSize(batchSize int) *Processor[In, Out] {
	self.Output = make(chan []Out)
	self.batchSize = batchSize
	self.queue.SetMinCapacity(uint(math.Round(1.5 * float64(batchSize))))
	return self
}

func (self *Processor[In, Out]) WithInputChannel(v chan In) *Processor[In, Out] {
	self.input = v
	return self
}

func (self *Processor[In, Out]) WithOnFlush(interval time.Duration, f func([]Out) ([]Out, error)) *Processor[In, Out] {
	self.flushInterval = interval
	self.onFlush = f
	return self
}

func (self *Processor[In, Out]) WithOnProcess(f func(In) ([]Out, error)) *Processor[In, Out] {
	self.onProcess = f
	return self
}

func (self *Processor[In, Out]) WithBackoff(maxElapsedTime, maxInterval time.Duration) *Processor[In, Out] {
	self.maxElapsedTime = maxElapsedTime
	self.maxInterval = maxInterval
	return self
}

func (self *Processor[In, Out]) flush() {
	// Copy data to avoid locking for too long
	data := make([]Out, 0, self.queue.Len())
	for i := 0; i < self.queue.Len(); i++ {
		data = append(data, self.queue.PopFront())
	}

	var out []Out
	err := NewRetry().
		WithContext(self.Ctx).
		WithMaxElapsedTime(self.maxElapsedTime).
		WithMaxInterval(self.maxInterval).
		Run(func() error {
			var err error
			out, err = self.onFlush(data)
			return err
		})
	if err != nil {
		self.Log.WithError(err).Error("Failed to flush data")
		return
	}

	if len(out) > 0 {
		select {
		case <-self.Ctx.Done():
		case self.Output <- out:
		}
	}
}

// Receives data from the input channel and saves in the database
func (self *Processor[In, Out]) run() (err error) {
	// Used to ensure data isn't stuck in Processor for too long
	timer := time.NewTimer(self.flushInterval)

	for {
		select {
		case in, ok := <-self.input:
			if !ok {
				// The only way input channel is closed is that the Processor's source is stopping
				// There will be no more data, flush everything there is and quit.
				self.flush()

				return
			}

			data, err := self.onProcess(in)
			if err != nil {
				continue
			}

			// Cache the processed data
			for _, d := range data {
				self.queue.PushBack(d)
			}

			if self.queue.Len() >= self.batchSize {
				self.flush()
			}

		case <-timer.C:
			// Flush is called even if the queue is empty
			self.flush()
			timer = time.NewTimer(self.flushInterval)
		}
	}
}
