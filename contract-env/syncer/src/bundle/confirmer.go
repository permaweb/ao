package bundle

import (
	"database/sql"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/listener"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/jackc/pgtype"
	"golang.org/x/exp/slices"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Periodically saves the confirmation state of the bundlet interactions
// This is done to prevent flooding database with bundle_items state updates
type Confirmer struct {
	*task.SinkTask[*Confirmation]
	monitor        monitoring.Monitor
	db             *gorm.DB
	networkMonitor *listener.NetworkMonitor
}

type Confirmation struct {
	InteractionID int
	BundlerTxID   string
	Response      pgtype.JSONB
}

func NewConfirmer(config *config.Config) (self *Confirmer) {
	self = new(Confirmer)

	self.SinkTask = task.NewSinkTask[*Confirmation](config, "confirmer").
		WithBatchSize(config.Bundler.ConfirmerBatchSize).
		WithOnFlush(config.Bundler.ConfirmerInterval, self.save).
		WithBackoff(config.Bundler.ConfirmerBackoffMaxElapsedTime, config.Bundler.ConfirmerBackoffMaxInterval)

	return
}

func (self *Confirmer) WithDB(db *gorm.DB) *Confirmer {
	self.db = db
	return self
}

func (self *Confirmer) WithInputChannel(input chan *Confirmation) *Confirmer {
	self.SinkTask.WithInputChannel(input)
	return self
}

func (self *Confirmer) WithMonitor(monitor monitoring.Monitor) *Confirmer {
	self.monitor = monitor
	return self
}

func (self *Confirmer) WithNetworkMonitor(v *listener.NetworkMonitor) *Confirmer {
	self.networkMonitor = v
	return self
}

func (self *Confirmer) save(confirmations []*Confirmation) error {
	if len(confirmations) == 0 {
		// Nothing to save
		return nil
	}

	self.Log.WithField("len", len(confirmations)).Trace("Saving confirmations to DB")

	// Sort confirmations by interaction ID to minimize deadlocks
	slices.SortFunc(confirmations, func(a, b *Confirmation) bool {
		return a.InteractionID < b.InteractionID
	})

	// Prepare ids
	ids := make([]int, len(confirmations))
	for i, confirmation := range confirmations {
		ids[i] = confirmation.InteractionID
	}

	// Network manager updates this value
	// NOTE: This can potentially block if NetworkMonitor can't get the first height
	currentBlockHeight := self.networkMonitor.GetLastNetworkInfo().Height

	// Uses one transaction to do all the updates
	// NOTE: It still uses many requests to the database,
	// it should be possible to combine updates into batches, but it's not a priority for now.
	err := self.db.Transaction(func(tx *gorm.DB) (err error) {
		err = tx.Table(model.TableInteraction).
			Select("1").
			Where("id IN ?", ids).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Error
		if err != nil {
			return
		}
		err = tx.Table(model.TableBundleItem).
			Select("1").
			Where("interaction_id IN ?", ids).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Error
		if err != nil {
			return
		}

		for _, confirmation := range confirmations {
			err := tx.Table(model.TableBundleItem).
				Where("interaction_id = ?", confirmation.InteractionID).
				Where("state = ?", model.BundleStateUploading).
				Updates(model.BundleItem{
					State:          model.BundleStateUploaded,
					BlockHeight:    sql.NullInt64{Int64: currentBlockHeight, Valid: true},
					BundlrResponse: confirmation.Response,
				}).
				Error
			if err != nil {
				return err
			}

			err = tx.Table(model.TableInteraction).
				Where("id = ?", confirmation.InteractionID).
				Update("bundler_tx_id", confirmation.BundlerTxID).
				Error
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		self.Log.WithError(err).Error("Failed to save bundle items, retrying...")

		// Update monitoring
		self.monitor.GetReport().Bundler.Errors.ConfirmationsSavedToDbError.Inc()
		return err
	}

	// Update monitoring
	self.monitor.GetReport().Bundler.State.ConfirmationsSavedToDb.Inc()

	return nil

}
