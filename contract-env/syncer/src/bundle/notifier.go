package bundle

import (
	"encoding/json"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/streamer"
	"github.com/warp-contracts/syncer/src/utils/task"

	"gorm.io/gorm"
)

// Gets a live stream of unbundled intearctions, parses them and puts them on the output channel
type Notifier struct {
	*task.Task
	db *gorm.DB

	streamer *streamer.Streamer
	monitor  monitoring.Monitor

	// Data about the interactions that need to be bundled
	output chan *model.BundleItem
}

func NewNotifier(config *config.Config) (self *Notifier) {
	self = new(Notifier)

	if config.Bundler.NotifierDisabled {
		self.Task = task.NewTask(config, "bundler-notifier")
		return
	}

	self.streamer = streamer.NewStreamer(config, "bundler-notifier").
		WithNotificationChannelName("bundle_items_pending").
		WithCapacity(10)

	self.Task = task.NewTask(config, "notifier").
		// Live source of interactions that need to be bundled
		WithSubtask(self.streamer.Task).
		// Interactions that somehow wasn't sent through the notification channel. Probably because of a restart.
		WithSubtaskFunc(self.run).
		// Workers unmarshal big JSON messages and optionally fetch data from the database if the messages wuldn't fit in the notification channel
		WithWorkerPool(config.Bundler.NotifierWorkerPoolSize, config.Bundler.NotifierWorkerQueueSize)

	return
}

func (self *Notifier) WithDB(db *gorm.DB) *Notifier {
	self.db = db
	return self
}

func (self *Notifier) WithMonitor(monitor monitoring.Monitor) *Notifier {
	self.monitor = monitor
	return self
}

func (self *Notifier) WithOutputChannel(bundleItems chan *model.BundleItem) *Notifier {
	self.output = bundleItems
	return self
}

func (self *Notifier) run() error {
	for {
		select {
		case <-self.StopChannel:
			self.Log.Debug("Stop passing interactions from notification")
			return nil
		case msg, ok := <-self.streamer.Output:
			if !ok {
				self.Log.Info("Notification streamer channel closed")
				return nil
			}

			self.SubmitToWorker(func() {
				var notification model.BundleItemNotification
				err := json.Unmarshal([]byte(msg), &notification)
				if err != nil {
					self.Log.WithError(err).Error("Failed to unmarshal notification")
					return
				}

				bundleItem := model.BundleItem{
					InteractionID: notification.InteractionID,
				}
				if notification.Transaction != nil || notification.DataItem != nil {
					if notification.Transaction != nil {
						bundleItem.Transaction = *notification.Transaction
					}

					if notification.Tags != nil {
						bundleItem.Tags = *notification.Tags
					}

					if notification.DataItem != nil {
						err = bundleItem.DataItem.Scan(*notification.DataItem)
						if err != nil {
							self.Log.WithError(err).Error("Failed to scan data item from notification")
							return
						}
					}
				} else {
					// Transaction was too big to fit into the notification channel
					// Only id is there, we need to fetch the rest of the data from the database
					err = self.db.WithContext(self.Ctx).
						Model(&model.BundleItem{}).
						Select("transaction", "tags", "data_item").
						Where("interaction_id = ?", notification.InteractionID).
						Scan(&bundleItem).
						Error
					if err != nil {
						// Action will be retried automatically, no need to do it here
						self.Log.WithError(err).Error("Failed to get bundle item")
						self.monitor.GetReport().Bundler.Errors.AdditionalFetchError.Inc()
						return
					}
					self.monitor.GetReport().Bundler.State.AdditionalFetches.Inc()
				}

				select {
				case <-self.StopChannel:
					return
				case self.output <- &bundleItem:
				}

				// Update metrics
				self.monitor.GetReport().Bundler.State.BundlesFromNotifications.Inc()

				// This might be the workload that unpauses the streamer
				if self.GetWorkerQueueFillFactor() < 0.1 {
					err := self.streamer.Resume()
					if err != nil {
						self.Log.WithError(err).Error("Failed to resume streamer")
					}
				}
			})

			// Pause streamer if the queue is too full or resume it
			if self.GetWorkerQueueFillFactor() > 0.9 {
				err := self.streamer.Pause()
				if err != nil {
					self.Log.WithError(err).Error("Failed to pause streamer")
				}
			}

		}
	}
}
