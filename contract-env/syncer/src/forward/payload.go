package forward

import "github.com/warp-contracts/syncer/src/utils/model"

type Payload struct {
	First       bool
	Last        bool
	Interaction *model.Interaction
}

func (self *Payload) IsFirst() bool {
	return self.First
}

func (self *Payload) IsLast() bool {
	return self.Last
}
