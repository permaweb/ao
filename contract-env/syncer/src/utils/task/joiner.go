package task

import (
	"sync"

	"github.com/warp-contracts/syncer/src/utils/config"
)

// Takes elements from multiple channels and sends them to a single channel
// Each channel may take assume and give up control of the output channel by sending messages
// Passed messages have to implement the interface JoinController for this to work
type Joiner[In JoinController] struct {
	*Task

	Output chan In

	mtx sync.RWMutex
}

type JoinController interface {
	// Returns true if message is the first message of a batch
	// After this message is sent, the channel will be the only forwarded channel until IsLast() is called
	IsFirst() bool

	// Returns true if message is the last message of a batch
	// After this message is sent the channel will no longer be the only forwarded channel
	IsLast() bool
}

func NewJoiner[In JoinController](config *config.Config, name string) (self *Joiner[In]) {
	self = new(Joiner[In])

	self.Output = make(chan In)

	self.Task = NewTask(config, name).
		WithOnAfterStop(func() {
			close(self.Output)
		})

	return
}

func (self *Joiner[In]) WithInputChannel(input chan In) *Joiner[In] {
	self.Task = self.Task.WithSubtaskFunc(func() error {
		return self.handleOneInput(input)
	})
	return self
}

func (self *Joiner[In]) WithCapacity(capacity int) *Joiner[In] {
	self.Output = make(chan In, capacity)
	return self
}

// Handles receiving messages from a single channel and forwarding them to the output channel
func (self *Joiner[In]) handleOneInput(input chan In) error {
	// This goroutine took over the output channel
	var isOwner bool

	for in := range input {
		// Lock only if it's not already owned
		if !isOwner {
			if in.IsFirst() {
				// This will be the only goroutine sending messages to the output channel
				self.mtx.Lock()
				isOwner = true
			} else {
				// Multiple channels may be sending messages at the same time
				// They are synchronized with the self.Output channel
				self.mtx.RLock()
			}
		}

		self.Output <- in

		if isOwner && in.IsLast() {
			isOwner = false
			self.mtx.Unlock()
		} else if !isOwner {
			self.mtx.RUnlock()
		}
	}

	return nil
}
