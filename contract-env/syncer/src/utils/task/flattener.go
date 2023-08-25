package task

import (
	"github.com/warp-contracts/syncer/src/utils/config"
)

// Accepts slices of elements and emits each element individually
type Flattener[In any] struct {
	*Task

	input  chan []In
	Output chan In
}

func NewFlattener[In any](config *config.Config, name string) (self *Flattener[In]) {
	self = new(Flattener[In])

	self.Output = make(chan In)

	self.Task = NewTask(config, name).
		WithSubtaskFunc(self.run).
		WithOnAfterStop(func() {
			close(self.Output)
		})

	return
}

func (self *Flattener[In]) WithInputChannel(input chan []In) *Flattener[In] {
	self.input = input
	return self
}

func (self *Flattener[In]) WithCapacity(capacity int) *Flattener[In] {
	self.Output = make(chan In, capacity)
	return self
}

func (self *Flattener[In]) run() error {
	for in := range self.input {
		for _, item := range in {
			self.Output <- item
		}
	}
	return nil
}
