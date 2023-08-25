package responses

type Upload struct {
	Id             string `json:"id"`
	Timestamp      uint64 `json:"timestamp"`
	Version        string `json:"version"`
	Public         string `json:"public"`
	Signature      string `json:"signature"`
	DeadlineHeight uint64 `json:"deadlineHeight"`
	Block          uint64 `json:"block"`
}
