package relay

import (
	"context"
	"errors"
	"sync"

	"github.com/cenkalti/backoff"
	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	"github.com/cometbft/cometbft/types"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"
	"gorm.io/gorm"
)

// Produces a stream of Sequencer's blocks
// It uses Streamer to get new blocks from the Sequencer
// It uses Sequencer's REST API for downloading historical blocks
// Downloads historical blocks in case there's a gap in the stream
type Source struct {
	*task.Task

	input            <-chan *types.Block
	Output           chan *types.Block
	db               *gorm.DB
	monitor          monitoring.Monitor
	client           *rpchttp.HTTP
	lastSyncedHeight int64
}

func NewSource(config *config.Config) (self *Source) {
	self = new(Source)

	self.Output = make(chan *types.Block, 1)

	self.Task = task.NewTask(config, "source").
		WithWorkerPool(config.Relayer.SourceMaxWorkers, config.Relayer.SourceMaxQueueSize).
		WithSubtaskFunc(self.run)

	return
}

func (self *Source) WithMonitor(monitor monitoring.Monitor) *Source {
	self.monitor = monitor
	return self
}

func (self *Source) WithDB(db *gorm.DB) *Source {
	self.db = db
	return self
}

func (self *Source) WithInputChannel(input <-chan *types.Block) *Source {
	self.input = input
	return self
}

func (self *Source) WithClient(client *rpchttp.HTTP) *Source {
	self.client = client
	return self
}

func (self *Source) getLastSyncedHeight() (out int64, err error) {
	return 1, nil
}

func (self *Source) send(block *types.Block) (err error) {
	self.Log.WithField("height", block.Height).
		Debug("Sending block")

	select {
	case <-self.Ctx.Done():
		err = errors.New("task closing")
		return
	case self.Output <- block:
		self.lastSyncedHeight = block.Height
	}
	return
}

// Downloads blocks in parallel
func (self *Source) download(len int) (err error) {
	out := make([]*types.Block, 0, len)

	// Sync between workers
	var mtx sync.Mutex
	var wg sync.WaitGroup
	wg.Add(len)

	for i := 0; i < len; i++ {
		height := self.lastSyncedHeight + int64(i)
		self.SubmitToWorker(func() {
			var (
				err   error
				block *ctypes.ResultBlock
			)
			// Retries downloading transaction until success or permanent error
			err = task.NewRetry().
				WithContext(self.Ctx).
				WithMaxElapsedTime(self.Config.Relayer.SourceBackoffMaxElapsedTime).
				WithMaxInterval(self.Config.Relayer.SourceBackoffMaxInterval).
				WithAcceptableDuration(self.Config.Relayer.SourceBackoffMaxInterval * 10).
				WithOnError(func(err error, isDurationAcceptable bool) error {
					self.Log.WithError(err).WithField("height", height).Warn("Failed to download Sequencer's block, retrying after timeout")

					if errors.Is(err, context.Canceled) && self.IsStopping.Load() {
						// Stopping
						return backoff.Permanent(err)
					}
					// self.monitor.GetReport().TransactionDownloader.Errors.Download.Inc()

					return err
				}).
				Run(func() error {
					block, err = self.client.Block(self.Ctx, &height)
					return err
				})

			if err != nil {
				// Permanent error
				// self.monitor.GetReport().TransactionDownloader.Errors.PermanentDownloadFailure.Inc()
				// self.Log.WithError(err).WithField("txId", txId).Error("Failed to download transaction, giving up")
				goto end
			}

			// Add to output
			mtx.Lock()
			out = append(out, block.Block)
			mtx.Unlock()

		end:
			wg.Done()
		})
	}

	// Wait for workers to finish
	wg.Wait()

	// Put blocks into the Output channel
	for _, block := range out {
		err = self.send(block)
		if err != nil {
			return
		}
	}
	return
}

// Download blocks from last synced blocked to the specified height (exclusive)
func (self *Source) catchUp(height int64) (err error) {
	len := height - self.lastSyncedHeight

	self.Log.WithField("last_synced_height", self.lastSyncedHeight).
		WithField("desired_height", height).
		WithField("num_blocks", len).
		Info("Catching up")

		// Divide remaining blocks into batches that are downloaded in parallel and put into the Output channel
	numBatches := int(len) / self.Config.Relayer.SourceBatchSize

	for i := 0; i < numBatches; i++ {
		err = self.download(self.Config.Relayer.SourceBatchSize)
		if err != nil {
			return
		}
	}

	// Last batch
	lastBatchSize := int(len) % self.Config.Relayer.SourceBatchSize
	if lastBatchSize != 0 {
		err = self.download(lastBatchSize)
		if err != nil {
			return
		}
	}

	return
}

func (self *Source) run() (err error) {
	self.lastSyncedHeight, err = self.getLastSyncedHeight()
	if err != nil {
		return
	}

	for block := range self.input {
		if block.Height > self.lastSyncedHeight+1 {
			err = self.catchUp(block.Height)
			if err != nil {
				return
			}
		}

		err = self.send(block)
		if err != nil {
			return
		}
	}

	return
}
