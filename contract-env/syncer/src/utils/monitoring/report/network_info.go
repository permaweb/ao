package report

import "go.uber.org/atomic"

type NetworkInfoErrors struct {
	NetworkInfoDownloadErrors atomic.Uint64 `json:"network_info_download"`
}

type NetworkInfoState struct {
	ArweaveCurrentHeight            atomic.Uint64 `json:"arweave_current_height"`
	ArweaveLastNetworkInfoTimestamp atomic.Uint64 `json:"arweave_last_network_info_timestamp"`
}

type NetworkInfoReport struct {
	State  NetworkInfoState  `json:"state"`
	Errors NetworkInfoErrors `json:"errors"`
}
