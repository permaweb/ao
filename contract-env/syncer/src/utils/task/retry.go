package task

import (
	"context"
	"time"

	"github.com/cenkalti/backoff/v4"
)

// Implement operation retrying
type Retry struct {
	startTime          time.Time
	ctx                context.Context
	maxElapsedTime     time.Duration
	maxInterval        time.Duration
	acceptableDuration time.Duration
	onError            func(error, bool) error
}

func NewRetry() *Retry {
	return new(Retry)
}

func (self *Retry) WithMaxElapsedTime(maxElapsedTime time.Duration) *Retry {
	self.maxElapsedTime = maxElapsedTime
	return self
}

func (self *Retry) WithMaxInterval(maxInterval time.Duration) *Retry {
	self.maxInterval = maxInterval
	return self
}

func (self *Retry) WithAcceptableDuration(v time.Duration) *Retry {
	self.acceptableDuration = v
	return self
}

func (self *Retry) WithContext(ctx context.Context) *Retry {
	self.ctx = ctx
	return self
}

func (self *Retry) WithOnError(v func(err error, isDurationAcceptable bool) error) *Retry {
	self.onError = v
	return self
}

func (self *Retry) Run(f func() error) error {
	self.startTime = time.Now()

	if self.acceptableDuration == 0 {
		self.acceptableDuration = 3 * self.maxInterval
	}

	b := backoff.NewExponentialBackOff()
	b.MaxElapsedTime = self.maxElapsedTime
	b.MaxInterval = self.maxInterval
	return backoff.Retry(func() error {
		err := f()
		if err != nil && self.onError != nil {
			return self.onError(err, time.Since(self.startTime) < self.acceptableDuration)
		}
		return nil
	}, backoff.WithContext(b, self.ctx))
}
