package report

import "go.uber.org/atomic"

type RunErrors struct {
	NumWatchdogRestarts atomic.Uint64 `json:"num_watchdog_restarts"`
}

type RunState struct {
	StartTimestamp atomic.Int64  `json:"start_timestamp"`
	UpForSeconds   atomic.Uint64 `json:"up_for_seconds"`
}

type RunReport struct {
	State  RunState  `json:"state"`
	Errors RunErrors `json:"errors"`
}
