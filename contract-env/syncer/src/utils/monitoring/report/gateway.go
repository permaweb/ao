package report

import (
	"go.uber.org/atomic"
)

type GatewayErrors struct {
	DbError atomic.Uint64 `json:"db_error"`
}

type GatewayState struct {
	InteractionsReturned atomic.Uint64 `json:"interactions_returned"`
}

type GatewayReport struct {
	State  GatewayState  `json:"state"`
	Errors GatewayErrors `json:"errors"`
}
