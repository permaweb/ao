package sw_types

import "github.com/everFinance/goar/types"

type DbInteraction struct {
	InteractionId      string
	Interaction        string
	BlockHeight        int64
	BlockId            string
	ContractId         string
	Function           string
	Input              string
	ConfirmationStatus string
}

type SwOwner struct {
	Address string `json:"address"`
}

type SwBlock struct {
	Height    int64  `json:"height"`
	Id        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
}

type Amount struct {
	Winston string `json:"winston"`
}

type SwInteraction struct {
	Id        string      `json:"id"`
	Owner     SwOwner     `json:"owner"`
	Recipient string      `json:"recipient"`
	Tags      []types.Tag `json:"tags"`
	Block     SwBlock     `json:"block"`
	Fee       Amount      `json:"fee"`
	Quantity  Amount      `json:"quantity"`
}
