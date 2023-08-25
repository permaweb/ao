package load

import "github.com/warp-contracts/syncer/src/utils/model"

type Payload struct {
	Interaction *model.Interaction
	BundleItem  *model.BundleItem
}
