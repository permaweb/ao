package forward

import (
	"runtime"
	"strings"
	"time"

	"github.com/jackc/pgtype"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"
	"gorm.io/gorm"
)

// Gets L1 (Arweave) interactions from the DB in batches
// Fills in last_sort_key for each interaction before emiting to the output channel
type ArweaveFetcher struct {
	*task.Task
	db *gorm.DB

	monitor monitoring.Monitor

	input  chan uint64
	Output chan *Payload
}

func NewArweaveFetcher(config *config.Config) (self *ArweaveFetcher) {
	self = new(ArweaveFetcher)

	self.Output = make(chan *Payload, config.Forwarder.ArweaveFetcherQueueSize)

	self.Task = task.NewTask(config, "arweave-fetcher").
		WithSubtaskFunc(self.run)

	return
}

func (self *ArweaveFetcher) WithDB(db *gorm.DB) *ArweaveFetcher {
	self.db = db
	return self
}

func (self *ArweaveFetcher) WithMonitor(monitor monitoring.Monitor) *ArweaveFetcher {
	self.monitor = monitor
	return self
}

func (self *ArweaveFetcher) WithInputChannel(input chan uint64) *ArweaveFetcher {
	self.input = input
	return self
}

func (self *ArweaveFetcher) run() (err error) {
	for height := range self.input {
		self.Log.WithField("height", height).Debug("New height to fetch")
		// Cache Contract id -> interaction sort key
		lastSortKeys := make(map[string]string)

		isFirstBatch := true
		isLastBatch := false
		isSkipSending := false

		// Set a deadline for processing the block
		deadline := time.NewTimer(self.Config.Forwarder.ArweaveFetcherBlockSendTimeout)

		// Fetch interactions in batches, offset is the batch number
		for offset := 0; ; offset++ {
			// Fetch interactions in batches
			var interactions []*model.Interaction

			err = self.db.WithContext(self.Ctx).
				Transaction(func(tx *gorm.DB) (err error) {
					// Get a batch of L1 interactions
					err = self.db.Table(model.TableInteraction).
						Where("block_height = ?", height).
						Where("source=?", "arweave").
						Limit(self.Config.Forwarder.FetcherBatchSize).
						Offset(offset * self.Config.Forwarder.FetcherBatchSize).
						Order("sort_key ASC").
						Find(&interactions).
						Error
					if err != nil {
						return
					}

					if len(interactions) != 0 {
						// Update last_sort_key for each interaction in the database
						// As a optimization lastSortKeys are cached in memory
						lastSortKeys, err = self.updateLastSortKey(tx, interactions, height, lastSortKeys)
						if err != nil {
							return
						}
					}

					isLastBatch = (len(interactions) < self.Config.Forwarder.FetcherBatchSize) ||
						// Edge case: num of interactions is a multiple of batch size
						(len(interactions) == 0 && offset != 0)

					if isLastBatch {
						// Update sync height after the whole batch is processed
						return self.updateSyncedHeight(tx, height)
					}

					return nil
				})
			if err != nil {
				self.Log.WithError(err).WithField("height", height).Error("Failed to fetch interactions from DB")

				// Dump interactions to the log
				for _, interaction := range interactions {
					self.Log.WithField("interaction_id", interaction.InteractionId).Error("Neglected interaction")
				}

				self.monitor.GetReport().Forwarder.Errors.DbFetchL1Interactions.Inc()

				// We can't simply return here, because it could potentially lead to blocking out L2 interactions.
				// Ensure "last" message is sent downstream
				goto finish
			}

			if len(interactions) == 0 && offset == 0 {
				self.Log.WithField("height", height).Info("No interactions for this height")
				break
			} else if !isSkipSending {
				self.Log.WithField("height", height).WithField("num", len(interactions)).Info("Got batch of L1 interactions from DB")

				for i, interaction := range interactions {
					payload := &Payload{
						First:       isFirstBatch && i == 0,
						Interaction: interaction,
					}

					// NOTE: Quit only when the whole batch is processed
					// That's why we're not waiting for closing of this task
					select {
					case <-deadline.C:
						// Skip sending iteractions if it takes too long for them to be processed
						// Setting last_sort_key is crucial, decouple from redis
						isSkipSending = true
						break
					case self.Output <- payload:
					}

					// Increment L1 interaction counter
					self.monitor.GetReport().Forwarder.State.L1Interactions.Inc()
				}
			}

		finish:
			// No more batches for this height?
			if isLastBatch || isSkipSending {
				// Pass downstream that this is the end of L1 interactions for this height
				payload := &Payload{First: false, Last: true, Interaction: nil}
				self.Output <- payload
				break
			}

			isFirstBatch = false

			if isSkipSending {
				self.Log.WithField("block_height", height).Warn("Skipping sending some interactions")
			}
		}

		// Output channel has a big capacity, give back the control to the scheduler
		runtime.Gosched()
	}
	return
}

func (self *ArweaveFetcher) updateSyncedHeight(tx *gorm.DB, height uint64) (err error) {
	var state model.State
	err = tx.WithContext(self.Ctx).
		Where("name = ?", model.SyncedComponentForwarder).
		First(&state).
		Error
	if err != nil {
		self.Log.WithError(err).Error("Failed to get state")
		return err
	}

	if state.FinishedBlockHeight < height {
		state.FinishedBlockHeight = height

		err = tx.Model(&model.State{
			Name: model.SyncedComponentForwarder,
		}).
			Updates(model.State{
				FinishedBlockHeight: height,
			}).
			Error
		if err != nil {
			self.Log.WithError(err).Error("Failed to update sync state after last block")
			self.monitor.GetReport().Forwarder.Errors.DbLastTransactionBlockHeight.Inc()
			return err
		}
	}

	// Update monitoring
	self.monitor.GetReport().Forwarder.State.FinishedHeight.Store(height)
	self.monitor.GetReport().Forwarder.State.BlocksBehindSyncer.Store(self.monitor.GetReport().Forwarder.State.CurrentSyncerHeight.Load() - height)

	return
}

func (self *ArweaveFetcher) updateLastSortKey(tx *gorm.DB, interactions []*model.Interaction, height uint64, lastSortKeys map[string]string) (out map[string]string, err error) {
	// Get contract ids of fetched interactions
	// Omit those that are already in the lastSortKeys map
	newContractIds := self.getNewContractIds(interactions, lastSortKeys)

	// Get last sort key for each new contract
	newLastSortKeys, err := self.getLastSortKeys(tx, newContractIds, height)
	if err != nil {
		self.Log.Error("Failed to get last sort keys for new contracts")
		return
	}

	// Merge new LSK into the existing map
	// out = tool.AppendMap(newLastSortKeys, lastSortKeys)
	for k, v := range newLastSortKeys {
		if _, ok := lastSortKeys[k]; ok {
			continue
		}
		// self.Log.WithField("k", k).WithField("v", v).Debug("New last sort key")
		lastSortKeys[k] = v
	}

	// Fill in last sort key for each interaction
	for _, interaction := range interactions {
		value, ok := lastSortKeys[interaction.ContractId]
		if ok {
			// Copy the old value to avoid this value being overwritten
			interaction.LastSortKey.String = strings.Clone(value)
			interaction.LastSortKey.Status = pgtype.Present
		} else {
			// First interaction in contract
			interaction.LastSortKey.Status = pgtype.Null
		}

		lastSortKeys[interaction.ContractId] = interaction.SortKey
	}

	// Update last sort key for each contract
	for _, interaction := range interactions {
		if interaction.LastSortKey.Status == pgtype.Null {
			// This is the first interaction for this contract, skip updating
			continue
		}

		err = tx.Transaction(func(tx2 *gorm.DB) error {
			// TX inside TX in order to avoid rolling back whole transaction upon error with one contract
			return tx2.Model(interaction).
				Update("last_sort_key", interaction.LastSortKey).
				Error
		})
		if err != nil {
			self.Log.WithError(err).
				WithField("contract_id", interaction.ContractId).
				WithField("interaction_id", interaction.InteractionId).
				Error("Failed to update last sort key, continuuing with other contracts")
			continue
		}

	}
	// Ignore errors from helper transaction
	err = nil

	out = lastSortKeys

	return
}

func (self *ArweaveFetcher) getNewContractIds(interactions []*model.Interaction, lastSortKeys map[string]string) (out []string) {
	contractIds := make(map[string]struct{})
	for _, interaction := range interactions {
		_, ok := lastSortKeys[interaction.ContractId]
		if ok {
			// There's already a sort key for this contract id
			continue
		}
		contractIds[interaction.ContractId] = struct{}{}
	}

	for contractId := range contractIds {
		out = append(out, contractId)
	}

	return
}

func (self *ArweaveFetcher) getLastSortKeys(tx *gorm.DB, contractIds []string, height uint64) (out map[string]string, err error) {
	out = make(map[string]string)

	var interactions = make([]*model.Interaction, 0, len(contractIds))

	err = tx.Table(model.TableInteraction).
		Select("contract_id, MAX(sort_key) AS sort_key").
		Where("contract_id IN ?", contractIds).
		Where("block_height < ?", height).
		Group("contract_id").
		Find(&interactions).
		Error
	if err != nil {
		return
	}

	for _, interaction := range interactions {
		out[interaction.ContractId] = interaction.SortKey
	}

	return
}
