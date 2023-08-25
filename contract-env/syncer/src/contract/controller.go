package contract

import (
	"fmt"
	"time"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/listener"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	monitor_contract "github.com/warp-contracts/syncer/src/utils/monitoring/contract"
	"github.com/warp-contracts/syncer/src/utils/peer_monitor"
	"github.com/warp-contracts/syncer/src/utils/publisher"
	"github.com/warp-contracts/syncer/src/utils/task"
	"github.com/warp-contracts/syncer/src/utils/warp"
)

type Controller struct {
	*task.Task
}

// Main class that orchestrates main syncer functionalities
// Setups listening and storing interactions
func NewController(config *config.Config, startBlockHeight, stopBlockHeight uint64, replaceExisting bool) (self *Controller, err error) {
	self = new(Controller)

	self.Task = task.NewTask(config, "contract-controller")

	monitor := monitor_contract.NewMonitor(config).
		WithMaxHistorySize(30)

	server := monitoring.NewServer(config).
		WithMonitor(monitor)

	watched := func() *task.Task {
		db, err := model.NewConnection(self.Ctx, self.Config, "contract")
		if err != nil {
			panic(err)
		}

		client := arweave.NewClient(self.Ctx, config).
			WithTagValidator(warp.ValidateTag)

		peerMonitor := peer_monitor.NewPeerMonitor(config).
			WithClient(client).
			WithMonitor(monitor)

		networkMonitor := listener.NewNetworkMonitor(config).
			WithClient(client).
			WithMonitor(monitor).
			WithInterval(config.NetworkMonitor.Period).
			WithRequiredConfirmationBlocks(config.NetworkMonitor.RequiredConfirmationBlocks)

		blockDownloader := listener.NewBlockDownloader(config).
			WithClient(client).
			WithInputChannel(networkMonitor.Output).
			WithBackoff(0, config.Contract.TransactionMaxInterval).
			WithMonitor(monitor)

		if startBlockHeight > 0 && stopBlockHeight > 0 {
			// Sync only a range of blocks
			blockDownloader = blockDownloader.WithHeightRange(startBlockHeight, stopBlockHeight)
		} else {
			// By default sync using the height saved in the db and never stop
			blockDownloader = blockDownloader.WithInitStartHeight(db, model.SyncedComponentContracts)
		}

		transactionDownloader := listener.NewTransactionDownloader(config).
			WithClient(client).
			WithInputChannel(blockDownloader.Output).
			WithMonitor(monitor).
			WithBackoff(config.Contract.TransactionMaxElapsedTime, config.Contract.TransactionMaxInterval).
			WithFilterContracts()

		loader := NewLoader(config).
			WithInputChannel(transactionDownloader.Output).
			WithMonitor(monitor).
			WithClient(client).
			WithDB(db)

		store := NewStore(config).
			WithInputChannel(loader.Output).
			WithReplaceExistingData(replaceExisting).
			WithMonitor(monitor).
			WithDB(db)

		flattener := task.NewFlattener[*ContractData](config, "contract-flattener").
			WithCapacity(config.Contract.StoreBatchSize).
			WithInputChannel(store.Output)

		duplicator := task.NewDuplicator[*ContractData](config, "contract-duplicator").
			WithOutputChannels(2, 0).
			WithInputChannel(flattener.Output)

		// Publish to all redis instances
		redisMapper := redisMapper(config).
			WithInputChannel(duplicator.NextChannel())

		redisDuplicator := task.NewDuplicator[*model.ContractNotification](config, "redis-duplicator").
			WithOutputChannels(len(config.Redis), 0).
			WithInputChannel(redisMapper.Output)

		redisPublishers := make([]*task.Task, 0, len(config.Redis))
		for i := range config.Redis {
			redisPublisher := publisher.NewRedisPublisher[*model.ContractNotification](config, config.Redis[i], fmt.Sprintf("contract-redis-publisher-%d", i)).
				WithChannelName(config.Contract.PublisherRedisChannelName).
				WithMonitor(monitor, i).
				WithInputChannel(redisDuplicator.NextChannel())
			redisPublishers = append(redisPublishers, redisPublisher.Task)
		}

		// Publish to AppSync
		appSyncMapper := appSyncMapper(config).
			WithInputChannel(duplicator.NextChannel())

		appSyncPublisher := publisher.NewAppSyncPublisher[*model.AppSyncContractNotification](config, "contract-appsync-publisher").
			WithChannelName(config.Contract.PublisherAppSyncChannelName).
			WithMonitor(monitor).
			WithInputChannel(appSyncMapper.Output)

		return task.NewTask(config, "watched-contract").
			WithSubtask(peerMonitor.Task).
			WithSubtask(networkMonitor.Task).
			WithSubtask(blockDownloader.Task).
			WithSubtask(transactionDownloader.Task).
			WithSubtask(loader.Task).
			WithSubtask(store.Task).
			WithSubtask(flattener.Task).
			WithSubtask(redisMapper.Task).
			WithSubtask(redisDuplicator.Task).
			WithSubtask(appSyncMapper.Task).
			WithSubtask(duplicator.Task).
			WithSubtaskSlice(redisPublishers).
			WithSubtask(appSyncPublisher.Task)
	}

	watchdog := task.NewWatchdog(config).
		WithTask(watched).
		WithIsOK(30*time.Second, func() bool {
			isOK := monitor.IsOK()
			if !isOK {
				monitor.Clear()
				monitor.GetReport().Run.Errors.NumWatchdogRestarts.Inc()
			}
			return isOK
		})

	self.Task = self.Task.
		// WithOnBeforeStart(func() error {
		// 	b, _ := json.Marshal(config)
		// 	self.Log.WithField("redisconfig", string(b)).Info("Config")
		// 	return nil
		// }).
		WithSubtask(monitor.Task).
		WithSubtask(server.Task).
		WithSubtask(watchdog.Task)

	return
}
