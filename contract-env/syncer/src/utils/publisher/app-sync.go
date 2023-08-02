package publisher

import (
	"encoding"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/cenkalti/backoff/v4"
	appsync "github.com/sony/appsync-client-go"
	"github.com/sony/appsync-client-go/graphql"
)

const mutation = `mutation Publish($data: AWSJSON!, $name: String!) {
	publish(data: $data, name: $name) {
	  data
	  name
	}
  }`

// Forwards messages to Redis
type AppSyncPublisher[In encoding.BinaryMarshaler] struct {
	*task.Task

	monitor monitoring.Monitor

	client      *appsync.Client
	channelName string
	input       chan In
}

type Args struct {
	Name string `json:"name"`
	Data string `json:"data"`
}

func NewAppSyncPublisher[In encoding.BinaryMarshaler](config *config.Config, name string) (self *AppSyncPublisher[In]) {
	self = new(AppSyncPublisher[In])

	self.Task = task.NewTask(config, name).
		WithSubtaskFunc(self.run).
		WithWorkerPool(config.AppSync.MaxWorkers, config.AppSync.MaxQueueSize)

	// Init AppSync client
	gqlClient := graphql.NewClient(config.AppSync.Url,
		graphql.WithCredential(config.AppSync.Token),
		graphql.WithTimeout(time.Second*30),
	)

	self.client = appsync.NewClient(appsync.NewGraphQLClient(gqlClient))

	return
}

func (self *AppSyncPublisher[In]) WithInputChannel(v chan In) *AppSyncPublisher[In] {
	self.input = v
	return self
}

func (self *AppSyncPublisher[In]) WithChannelName(v string) *AppSyncPublisher[In] {
	self.channelName = v
	return self
}

func (self *AppSyncPublisher[In]) WithMonitor(monitor monitoring.Monitor) *AppSyncPublisher[In] {
	self.monitor = monitor
	return self
}

func (self *AppSyncPublisher[In]) publish(data []byte) (err error) {
	// Serialize args
	args := Args{
		Name: self.channelName,
		Data: string(data),
	}

	argsBuf, err := json.Marshal(args)
	if err != nil {
		return
	}
	variables := json.RawMessage(argsBuf)

	// Perform the request
	response, err := self.client.Post(graphql.PostRequest{
		Query:     mutation,
		Variables: &variables,
	})
	if err != nil {
		return err
	}

	// Check response
	if response.StatusCode != nil && *response.StatusCode != http.StatusOK {
		err = fmt.Errorf("appsync publish failed with status %d", *response.StatusCode)
		if *response.StatusCode > 399 && *response.StatusCode < 500 {
			// Something's wrong with client configuration, don't retry
			err = backoff.Permanent(err)
		}
		return
	}
	return nil
}

func (self *AppSyncPublisher[In]) run() (err error) {
	for data := range self.input {
		data := data
		self.SubmitToWorker(func() {
			self.Log.Debug("App sync publish...")
			defer self.Log.Debug("...App sync publish done")

			// Serialize to JSON
			jsonData, err := data.MarshalBinary()
			if err != nil {
				self.Log.WithError(err).Error("Failed to marshal to json")
				return
			}

			// Retry on failure with exponential backoff
			err = task.NewRetry().
				WithContext(self.Ctx).
				WithMaxElapsedTime(self.Config.AppSync.BackoffMaxElapsedTime).
				WithMaxInterval(self.Config.AppSync.BackoffMaxInterval).
				WithOnError(func(err error, isDurationeAcceptable bool) error {
					self.Log.WithError(err).Error("Appsync publish failed, retrying")
					self.monitor.GetReport().AppSyncPublisher.Errors.Publish.Inc()
					return err
				}).
				Run(func() error {
					return self.publish(jsonData)
				})

			if err != nil {
				self.Log.WithError(err).Error("Failed to publish to appsync after retries")
				self.monitor.GetReport().AppSyncPublisher.Errors.PersistentFailure.Inc()
				return
			}

			self.monitor.GetReport().AppSyncPublisher.State.MessagesPublished.Inc()
		})
	}
	return nil
}
