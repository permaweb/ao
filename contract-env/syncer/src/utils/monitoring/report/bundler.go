package report

import (
	"go.uber.org/atomic"
)

type BundlerErrors struct {
	BundrlError                 atomic.Uint64 `json:"bundrl_error"`
	BundrlMarshalError          atomic.Uint64 `json:"bundrl_marshal_error"`
	ConfirmationsSavedToDbError atomic.Uint64 `json:"confirmations_saved_to_db_error"`
	AdditionalFetchError        atomic.Uint64 `json:"additional_fetch_error"`
	PollerFetchError            atomic.Uint64 `json:"poller_fetch_error"`
}

type BundlerState struct {
	// Transactions that are pending, waiting to be bundled in the database
	PendingBundleItems atomic.Int64 `json:"pending_bundle_items"`

	// Counting bundles that come from the database
	BundlesFromNotifications  atomic.Uint64 `json:"bundles_from_notifications"`
	AdditionalFetches         atomic.Uint64 `json:"additional_fetches"`
	BundlesFromSelects        atomic.Uint64 `json:"bundles_from_selects"`
	RetriedBundlesFromSelects atomic.Uint64 `json:"retried_bundles_from_selects"`
	AllBundlesFromDb          atomic.Uint64 `json:"all_bundles_from_db"`

	// Counting bundles sent to bundlr.network
	BundlrSuccess atomic.Uint64 `json:"bundlr_success"`

	// Counting properly saved confirmations that bundle is sent
	ConfirmationsSavedToDb atomic.Uint64 `json:"confirmations_saved_to_db"`
}

type BundlerReport struct {
	State  BundlerState  `json:"state"`
	Errors BundlerErrors `json:"errors"`
}
