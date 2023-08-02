package load

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
)

// Periodically saves the states
// SinkTask handles caching data and periodically calling flush function
type Store struct {
	*task.SinkTask[*Payload]
	db *gorm.DB
}

func NewStore(config *config.Config) (self *Store) {
	self = new(Store)

	self.SinkTask = task.NewSinkTask[*Payload](config, "store").
		WithOnFlush(500*time.Millisecond, self.save).
		WithBatchSize(15).
		WithBackoff(0, 10*time.Second)

	return
}

func (self *Store) WithDB(db *gorm.DB) *Store {
	self.db = db
	return self
}

func (self *Store) WithInputChannel(input chan *Payload) *Store {
	self.SinkTask = self.SinkTask.WithInputChannel(input)
	return self
}

func (self *Store) save(payloads []*Payload) error {
	self.Log.WithField("len", len(payloads)).Info("Saving payloads")

	var out string
	err := self.db.Transaction(func(tx *gorm.DB) (err error) {
		for _, payload := range payloads {
			self.Log.WithField("id", payload.Interaction.InteractionId).Info("Interaction")
			err = tx.WithContext(self.Ctx).Raw(`
			WITH ins_interaction AS (
				INSERT INTO interactions (interaction_id,
										  interaction,
										  block_height,
										  block_id,
										  contract_id,
										  function,
										  input,
										  confirmation_status,
										  confirming_peer,
										  source,
										  block_timestamp,
										  interact_write,
										  sort_key,
										  evolve,
										  testnet,
										  last_sort_key,
										  owner,
										  sync_timestamp)
					VALUES (@interaction_id,
							@interaction,
							@block_height,
							@block_id,
							@contract_id,
							@function,
							@input,
							@confirmation_status,
							@confirming_peer,
							@source,
							@block_timestamp,
							@interact_write,
							@sort_key,
							@evolve,
							@testnet,
							@prev_sort_key,
							@owner,
							@sync_timestamp)
					RETURNING id)
			INSERT
			INTO bundle_items (interaction_id, state, transaction, tags)
			SELECT i.id, 'PENDING', @original_transaction, @tags
			FROM ins_interaction i;
			`,
				sql.Named("interaction_id", payload.Interaction.InteractionId),
				sql.Named("interaction", payload.Interaction.Interaction),
				sql.Named("block_height", payload.Interaction.BlockHeight),
				sql.Named("block_id", payload.Interaction.BlockId),
				sql.Named("contract_id", payload.Interaction.ContractId),
				sql.Named("function", payload.Interaction.Function),
				sql.Named("input", payload.Interaction.Input),
				sql.Named("confirmation_status", payload.Interaction.ConfirmationStatus),
				sql.Named("confirming_peer", ""),
				sql.Named("source", payload.Interaction.Source),
				sql.Named("block_timestamp", payload.Interaction.BlockTimestamp),
				sql.Named("interact_write", payload.Interaction.InteractWrite),
				sql.Named("sort_key", payload.Interaction.SortKey),
				sql.Named("evolve", payload.Interaction.Evolve),
				sql.Named("testnet", payload.Interaction.Testnet),
				sql.Named("prev_sort_key", strconv.Itoa(int(time.Now().Unix()))),
				sql.Named("owner", payload.Interaction.Owner),
				sql.Named("sync_timestamp", 1234),
				sql.Named("original_transaction", payload.BundleItem.Transaction),
				sql.Named("tags", payload.BundleItem.Tags),
			).Scan(&out).Error
			if err != nil {
				self.Log.WithError(err).Error("Failed to save bundle item")
				return
			}

			self.Log.WithField("out", out).Info("Out")
			// err = tx.Create(payload.Interaction).Error
			// if err != nil {
			// 	self.Log.WithError(err).Error("Failed to save interaction")
			// 	continue
			// }

			// payload.BundleItem.InteractionID = payload.Interaction.ID
			// payload.BundleItem.State = model.BundleStatePending
			// payload.BundleItem.BundlrResponse.Status = pgtype.Null

			// err = tx.Create(payload.BundleItem).Error
			// if err != nil {
			// 	self.Log.WithError(err).Error("Failed to save bundle item")
			// 	continue
			// }
		}
		return
	})

	if err != nil {
		self.Log.WithError(err).Error("Failed to save interaction")
		return nil
	}
	self.Log.WithField("len", len(payloads)).Info("Saved payloads")

	return nil
}
