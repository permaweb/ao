package model

import "database/sql/driver"

type BundleState string

const (
	BundleStatePending   BundleState = "PENDING"
	BundleStateUploading BundleState = "UPLOADING"
	BundleStateUploaded  BundleState = "UPLOADED"
	BundleStateChecking  BundleState = "CHECKING"
	BundleStateOnArweave BundleState = "ON_ARWEAVE"
	BundleStateMalformed BundleState = "MALFORMED"
)

func (self *BundleState) Scan(value interface{}) error {
	*self = BundleState(value.(string))
	return nil
}

func (self BundleState) Value() (driver.Value, error) {
	return string(self), nil
}
