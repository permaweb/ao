package model

import (
	"database/sql"
	"time"

	"github.com/jackc/pgtype"
)

const (
	TableBundleItem = "bundle_items"
)

// CREATE TABLE "bundle_items" ("interaction_id" bigserial NOT NULL,"state"  bundle_state NOT NULL,"block_height" bigint,"updated_at" timestamptz,PRIMARY KEY ("interaction_id"),CONSTRAINT "fk_bundle_items_interaction" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id"))
// CREATE INDEX IF NOT EXISTS "idx_bundle_items_block_height" ON "bundle_items" USING btree("block_height" desc) WHERE state != 'ON_ARWEAVE'
type BundleItem struct {
	// Numerical id of the interaction
	InteractionID int
	// Alternative way of bundling. GW creates data items and stores them in this column
	DataItem pgtype.Bytea
	// Can be preloaded by gorm, but isn't by default.
	Interaction Interaction
	// Oryginal transaction needed to create the bundle
	Transaction pgtype.JSONB
	// Tags created by the sequencer
	Tags pgtype.JSONB
	// State of bundle
	State BundleState
	// Block height upon which interaction was bundled. Used to trigger verification later
	BlockHeight sql.NullInt64
	// Response from bundlr.network
	BundlrResponse pgtype.JSONB
	// Time of the last update to this row
	UpdatedAt time.Time
}

func (BundleItem) TableName() string {
	return "bundle_items"
}
