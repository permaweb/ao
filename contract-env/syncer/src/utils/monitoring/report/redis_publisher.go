package report

import (
	"go.uber.org/atomic"
)

type RedisPublisherErrors struct {
	Publish           atomic.Uint64 `json:"publish"`
	PersistentFailure atomic.Uint64 `json:"persistent"`
}

type RedisPublisherState struct {
	IsConnected                    atomic.Int64  `json:"is_connected"`
	LastSuccessfulMessageTimestamp atomic.Int64  `json:"last_successful_message_timestamp"`
	MessagesPublished              atomic.Uint64 `json:"messages_published"`
	PoolHits                       atomic.Uint32 `json:"pool_hits"`
	PoolIdleConns                  atomic.Uint32 `json:"pool_idle_conns"`
	PoolMisses                     atomic.Uint32 `json:"pool_misses"`
	PoolStaleConns                 atomic.Uint32 `json:"pool_stale_conns"`
	PoolTimeouts                   atomic.Uint32 `json:"pool_timeouts"`
	PoolTotalConns                 atomic.Uint32 `json:"pool_total_conns"`
}

type RedisPublisherReport struct {
	State  RedisPublisherState  `json:"state"`
	Errors RedisPublisherErrors `json:"errors"`
}
