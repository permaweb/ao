package report

import (
	"go.uber.org/atomic"
)

type AppSyncPublisherErrors struct {
	Publish           atomic.Uint64 `json:"publish"`
	PersistentFailure atomic.Uint64 `json:"persistent"`
}

type AppSyncPublisherState struct {
	MessagesPublished atomic.Uint64 `json:"messages_published"`
}

type AppSyncPublisherReport struct {
	State  AppSyncPublisherState  `json:"state"`
	Errors AppSyncPublisherErrors `json:"errors"`
}
