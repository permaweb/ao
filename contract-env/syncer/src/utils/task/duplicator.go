package task

import (
	"errors"
	"sync"

	"github.com/warp-contracts/syncer/src/utils/config"
)

// Takes item from input channel and in parallel puts to all output channels.
// Payload needs to be broadcasted into all channels, otherwise it blocks
type Duplicator[In any] struct {
	*Task

	input          chan In
	output         []chan In
	freeChannelIdx int
}

func NewDuplicator[In any](config *config.Config, name string) (self *Duplicator[In]) {
	self = new(Duplicator[In])

	self.Task = NewTask(config, name).
		WithSubtaskFunc(self.run).
		WithOnBeforeStart(func() error {
			if self.freeChannelIdx != len(self.output) {
				return errors.New("Not all output channels are initialized")
			}
			return nil
		}).
		WithOnAfterStop(func() {
			for i := range self.output {
				close(self.output[i])
			}
		})

	return
}

func (self *Duplicator[In]) WithInputChannel(input chan In) *Duplicator[In] {
	self.input = input
	return self
}

func (self *Duplicator[In]) WithOutputChannels(numChannels, capacity int) *Duplicator[In] {
	self.output = make([]chan In, 0, numChannels)
	for i := 0; i < numChannels; i++ {
		self.output = append(self.output, make(chan In, capacity))
	}
	self.Task = self.Task.WithWorkerPool(numChannels, 1)
	return self
}

func (self *Duplicator[In]) NextChannel() (out chan In) {
	out = self.output[self.freeChannelIdx]
	self.freeChannelIdx += 1
	return
}

func (self *Duplicator[In]) run() error {
	wg := sync.WaitGroup{}
	for in := range self.input {
		// self.Log.Debug("-> Duplicator send")
		in := in
		wg.Add(len(self.output))
		for channelIdx := range self.output {
			channelIdx := channelIdx
			self.SubmitToWorker(func() {
				select {
				case <-self.Ctx.Done():
				case self.output[channelIdx] <- in:
				}

				wg.Done()
			})
		}

		// Wait for all channels to receive data
		wg.Wait()
		// self.Log.Debug("<- Duplicator send")
	}
	return nil
}
