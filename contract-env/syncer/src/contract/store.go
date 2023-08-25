package contract

import (
	"errors"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Store handles saving data to the database in na robust way.
// - groups incoming contracts into batches,
// - ensures data isn't stuck even if a batch isn't big enough
type Store struct {
	*task.Processor[*Payload, *ContractData]

	DB *gorm.DB

	monitor monitoring.Monitor

	savedBlockHeight  uint64
	finishedHeight    uint64
	finishedTimestamp uint64
	finishedBlockHash []byte

	replaceExistingData bool
}

func NewStore(config *config.Config) (self *Store) {
	self = new(Store)

	self.Processor = task.NewProcessor[*Payload, *ContractData](config, "store-contract").
		WithBatchSize(config.Contract.StoreBatchSize).
		WithOnFlush(config.Contract.StoreInterval, self.flush).
		WithOnProcess(self.process).
		WithBackoff(config.Contract.StoreBackoffMaxElapsedTime, config.Contract.StoreBackoffMaxInterval)

	return
}

func (self *Store) WithMonitor(v monitoring.Monitor) *Store {
	self.monitor = v
	return self
}

func (self *Store) WithInputChannel(v chan *Payload) *Store {
	self.Processor = self.Processor.WithInputChannel(v)
	return self
}

func (self *Store) WithReplaceExistingData(replace bool) *Store {
	self.replaceExistingData = replace
	return self
}

func (self *Store) WithDB(v *gorm.DB) *Store {
	self.DB = v
	return self
}

func (self *Store) process(payload *Payload) (data []*ContractData, err error) {
	self.finishedHeight = payload.BlockHeight
	self.finishedTimestamp = payload.BlockTimestamp
	self.finishedBlockHash = payload.BlockHash
	data = payload.Data
	return
}

func (self *Store) flush(data []*ContractData) (out []*ContractData, err error) {
	if self.savedBlockHeight == self.finishedHeight && len(data) == 0 {
		// No need to flush, nothing changed
		return
	}

	if len(data) > 0 {
		self.Log.WithField("len", len(data)).Debug("Flushing contracts")
		defer self.Log.Debug("Flushing contracts done")
	}

	// Create batches that later can be committed in a transaction
	contracts := make([]*model.Contract, 0, len(data))
	sources := make([]*model.ContractSource, 0, len(data))
	for _, d := range data {
		contracts = append(contracts, d.Contract)

		if d.Source != nil {
			// Neglect empty sources
			sources = append(sources, d.Source)
		}
	}

	err = self.DB.WithContext(self.Ctx).
		Transaction(func(tx *gorm.DB) error {
			if self.finishedHeight <= 0 {
				return errors.New("block height too small")
			}

			// Get the state
			var state model.State
			err = tx.WithContext(self.Ctx).
				Where("name = ?", model.SyncedComponentContracts).
				First(&state).
				Error
			if err != nil {
				self.Log.WithError(err).Error("Failed to get state")
				self.monitor.GetReport().Contractor.Errors.DbLastTransactionBlockHeight.Inc()
				return err
			}

			// Update state only if block height is higher
			if state.FinishedBlockHeight < self.finishedHeight {
				err = tx.WithContext(self.Ctx).
					Model(&model.State{
						Name: model.SyncedComponentContracts,
					}).
					Updates(model.State{
						FinishedBlockHeight:    self.finishedHeight,
						FinishedBlockTimestamp: self.finishedTimestamp,
						FinishedBlockHash:      self.finishedBlockHash,
					}).
					Error
				if err != nil {
					self.Log.WithError(err).Error("Failed to update stmonitorate after last block")
					self.monitor.GetReport().Contractor.Errors.DbLastTransactionBlockHeight.Inc()
					return err
				}
			}

			// Insert contract
			err = tx.WithContext(self.Ctx).
				Table(model.TableContract).
				Clauses(clause.OnConflict{
					DoNothing: !self.replaceExistingData,
					Columns:   []clause.Column{{Name: "contract_id"}},
					UpdateAll: self.replaceExistingData,
				}).
				CreateInBatches(contracts, 5).
				Error
			if err != nil {
				self.Log.WithError(err).Error("Failed to insert contract")
				self.monitor.GetReport().Contractor.Errors.DbContractInsert.Inc()
				return err
			}

			// Insert Source
			err = tx.WithContext(self.Ctx).
				Table(model.TableContractSource).
				Clauses(clause.OnConflict{
					DoNothing: !self.replaceExistingData,
					Columns:   []clause.Column{{Name: "src_tx_id"}},
					UpdateAll: self.replaceExistingData}).
				CreateInBatches(sources, 5).
				Error
			if err != nil {
				self.Log.WithError(err).Error("Failed to insert contract source")
				self.monitor.GetReport().Contractor.Errors.DbSourceInsert.Inc()
				return err
			}

			return nil
		})
	if err != nil {
		return
	}

	self.monitor.GetReport().Contractor.State.ContractsSaved.Add(uint64(len(data)))

	// Update saved block height
	self.savedBlockHeight = self.finishedHeight

	self.monitor.GetReport().Contractor.State.FinishedHeight.Store(self.savedBlockHeight)

	// Everything went well, pass all data further
	out = data
	return
}
