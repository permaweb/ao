package relay

import (
	"github.com/cometbft/cometbft/types"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
)

// Store handles saving data to the database in na robust way.
// - groups incoming Interactions into batches,
// - ensures data isn't stuck even if a batch isn't big enough
type Store struct {
	*task.Processor[*types.Block, types.Tx]

	DB      *gorm.DB
	monitor monitoring.Monitor

	savedBlockHeight  uint64
	finishedTimestamp uint64
	finishedHeight    uint64
	finishedBlockHash []byte
}

func NewStore(config *config.Config) (self *Store) {
	self = new(Store)

	self.Processor = task.NewProcessor[*types.Block, types.Tx](config, "store").
		WithBatchSize(config.Syncer.StoreBatchSize).
		WithOnFlush(config.Syncer.StoreMaxTimeInQueue, self.flush).
		WithOnProcess(self.process).
		WithBackoff(0, config.Syncer.StoreMaxBackoffInterval)

	return
}

func (self *Store) WithMonitor(v monitoring.Monitor) *Store {
	self.monitor = v
	return self
}

func (self *Store) WithInputChannel(v chan *types.Block) *Store {
	self.Processor = self.Processor.WithInputChannel(v)
	return self
}

func (self *Store) WithDB(v *gorm.DB) *Store {
	self.DB = v
	return self
}

func (self *Store) process(block *types.Block) (out []types.Tx, err error) {
	self.Log.WithField("height", block.Height).Debug("Processing")
	self.finishedTimestamp = uint64(block.Time.UnixMilli())
	self.finishedHeight = uint64(block.Height)
	self.finishedBlockHash = block.LastCommitHash
	out = block.Txs
	return
}

func (self *Store) flush(data []types.Tx) (out []types.Tx, err error) {
	self.Log.WithField("count", len(data)).Debug("Flushing")
	if self.savedBlockHeight == self.finishedHeight && len(data) == 0 {
		// No need to flush, nothing changed
		return
	}

	self.Log.WithField("count", len(data)).Trace("Flushing interactions")
	defer self.Log.Trace("Flushing interactions done")

	// // Set sync timestamp
	// now := time.Now().UnixMilli()
	// for _, interaction := range data {
	// 	err = interaction.SyncTimestamp.Set(now)
	// 	if err != nil {
	// 		self.Log.WithError(err).Error("Failed to set sync_timestamp")
	// 		return
	// 	}
	// }

	// err = self.DB.WithContext(self.Ctx).
	// 	Transaction(func(tx *gorm.DB) error {
	// 		if self.finishedHeight <= 0 {
	// 			return errors.New("block height too small")
	// 		}
	// 		err = tx.WithContext(self.Ctx).
	// 			Model(&model.State{
	// 				Name: model.SyncedComponentInteractions,
	// 			}).
	// 			Updates(model.State{
	// 				FinishedBlockTimestamp: self.finishedTimestamp,
	// 				FinishedBlockHeight:    self.finishedHeight,
	// 				FinishedBlockHash:      self.finishedBlockHash,
	// 			}).
	// 			Error
	// 		if err != nil {
	// 			self.Log.WithError(err).Error("Failed to update last transaction block height")
	// 			self.monitor.GetReport().Syncer.Errors.DbLastTransactionBlockHeightError.Inc()
	// 			return err
	// 		}

	// 		if len(data) == 0 {
	// 			return nil
	// 		}

	// 		err = tx.WithContext(self.Ctx).
	// 			Table("interactions").
	// 			Clauses(clause.OnConflict{
	// 				DoNothing: true,
	// 				Columns:   []clause.Column{{Name: "interaction_id"}},
	// 				UpdateAll: false,
	// 			}).
	// 			CreateInBatches(data, len(data)).
	// 			Error
	// 		if err != nil {
	// 			self.Log.WithError(err).Error("Failed to insert Interactions")
	// 			self.Log.WithField("interactions", data).Debug("Failed interactions")
	// 			self.monitor.GetReport().Syncer.Errors.DbInteractionInsert.Inc()
	// 			return err
	// 		}
	// 		return nil
	// 	})
	// if err != nil {
	// 	return
	// }

	// // Successfuly saved interactions
	// self.monitor.GetReport().Syncer.State.InteractionsSaved.Add(uint64(len(data)))

	// // Update saved block height
	// self.savedBlockHeight = self.finishedHeight

	// self.monitor.GetReport().Syncer.State.FinishedHeight.Store(int64(self.savedBlockHeight))

	// // Processing stops here, no need to return anything
	// out = nil
	return
}
