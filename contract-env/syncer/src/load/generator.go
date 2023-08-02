package load

import (
	"time"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/task"
	"github.com/warp-contracts/syncer/src/utils/tool"
)

// Generates fake transactions
type Generator struct {
	*task.Task

	v      []byte
	Output chan *arweave.Transaction
}

func NewGenerator(config *config.Config) (self *Generator) {
	self = new(Generator)

	self.v = []byte(tool.RandomString(100))
	self.Output = make(chan *arweave.Transaction)

	self.Task = task.NewTask(config, "generator").
		WithPeriodicSubtaskFunc(1000*time.Millisecond, self.runPeriodically)

	return
}

func (self *Generator) runPeriodically() error {
	// self.Log.Info("Generated tx")
	tx := self.fakeTransaction()

	select {
	case <-self.StopChannel:
	case self.Output <- tx:
	}
	return nil
}

func (self *Generator) fakeTransaction() *arweave.Transaction {
	return &arweave.Transaction{
		Signature: arweave.Base64String("fake"),
		Owner:     arweave.Base64String("fake"),
		Tags: []arweave.Tag{
			{Name: arweave.Base64String("bundler-tests"), Value: arweave.Base64String("true")},
			{Name: arweave.Base64String(tool.RandomString(43)), Value: arweave.Base64String(tool.RandomString(43))},
			{Name: arweave.Base64String(tool.RandomString(43)), Value: arweave.Base64String(tool.RandomString(43))},
			{Name: arweave.Base64String(tool.RandomString(43)), Value: arweave.Base64String(tool.RandomString(43))},
			{Name: arweave.Base64String(tool.RandomString(43)), Value: arweave.Base64String(tool.RandomString(10))},
		},
		Data: arweave.Base64String(tool.CryptoRandomBytes(100)),
		ID:   arweave.Base64String(tool.CryptoRandomBytes(43)).Base64(),
	}
}
