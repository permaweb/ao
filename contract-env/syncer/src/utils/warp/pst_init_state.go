package warp

import "encoding/json"

type PstInitState struct {
	Ticker   *string      `json:"ticker"`
	Name     *string      `json:"name"`
	Balances *interface{} `json:"balances"`
}

func ParsePstInitState(buf []byte) (out *PstInitState, err error) {
	out = new(PstInitState)
	err = json.Unmarshal(buf, out)
	return
}

func (self *PstInitState) IsPst() bool {
	return self.Ticker != nil && self.Balances != nil
}
