package report

import (
	"go.uber.org/atomic"
)

type RelayerErrors struct {
}

type RelayerState struct {
	BlocksReceived atomic.Uint64 `json:"blocks_received"`
}

type RelayerReport struct {
	State  RelayerState  `json:"state"`
	Errors RelayerErrors `json:"errors"`
}
