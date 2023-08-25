package model

import (
	"github.com/jackc/pgtype"
)

// JSON message sent through the notification channel
type BundleItemNotification struct {
	InteractionID int           `json:"id"`
	Transaction   *pgtype.JSONB `json:"tx"`
	Tags          *pgtype.JSONB `json:"tg"`
	DataItem      *string       `json:"di"`
}
