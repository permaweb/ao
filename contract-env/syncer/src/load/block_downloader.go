package load

import (
	"sync"
	"time"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/task"
)

// Gets the latest block
type BlockDownloader struct {
	*task.Task
	mtx                     sync.Mutex
	blockAvailableCondition *sync.Cond
	client                  *arweave.Client

	input chan *arweave.NetworkInfo

	// Runtime state
	block *arweave.Block
}

func NewBlockDownloader(config *config.Config) (self *BlockDownloader) {
	self = new(BlockDownloader)

	self.blockAvailableCondition = sync.NewCond(&self.mtx)

	self.Task = task.NewTask(config, "block-downloader").
		WithSubtaskFunc(self.run)

	return
}

func (self *BlockDownloader) WithInputChannel(v chan *arweave.NetworkInfo) *BlockDownloader {
	self.input = v
	return self
}

func (self *BlockDownloader) WithClient(client *arweave.Client) *BlockDownloader {
	self.client = client
	return self
}

func (self *BlockDownloader) GetNewestBlock() *arweave.Block {
	var block *arweave.Block
	self.blockAvailableCondition.L.Lock()
	for self.block == nil {
		self.blockAvailableCondition.Wait()
	}
	block = self.block
	self.blockAvailableCondition.L.Unlock()

	return block
}

func (self *BlockDownloader) run() (err error) {
	for networkInfo := range self.input {

	retry:

		block, _, err := self.client.GetBlockByHeight(self.Ctx, networkInfo.Height)
		if err != nil {
			self.Log.WithError(err).Error("Failed to get block")
			time.Sleep(10 * time.Second)
			goto retry
		}

		self.blockAvailableCondition.L.Lock()
		if block != nil {
			self.block = block
			self.blockAvailableCondition.Broadcast()
		}
		self.blockAvailableCondition.L.Unlock()

		self.Log.Info("Saved block")

	}
	return
}
