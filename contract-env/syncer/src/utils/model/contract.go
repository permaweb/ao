package model

import (
	"github.com/jackc/pgtype"
)

const (
	TableContract = "contracts"

	ContractTypePst   = "pst"
	ContractTypeOther = "other"
)

type Contract struct {
	ContractId          string
	SrcTxId             pgtype.Varchar
	InitState           pgtype.JSONB
	Owner               pgtype.Varchar
	Type                pgtype.Varchar
	Project             pgtype.Varchar
	PstTicker           pgtype.Varchar
	PstName             pgtype.Varchar
	BlockHeight         uint64 // NOT NULL
	ContentType         pgtype.Varchar
	BundlerContractTxId pgtype.Varchar
	BundlerContractNode pgtype.Varchar
	ContractTx          pgtype.JSONB
	BlockTimestamp      uint64 // NOT NULL
	Testnet             pgtype.Varchar
	DeploymentType      pgtype.Varchar
	Manifest            pgtype.JSONB
	SyncTimestamp       pgtype.Int8
}

func NewContract() *Contract {
	return &Contract{
		SrcTxId:             pgtype.Varchar{Status: pgtype.Null},
		InitState:           pgtype.JSONB{Status: pgtype.Null},
		Owner:               pgtype.Varchar{Status: pgtype.Null},
		Type:                pgtype.Varchar{Status: pgtype.Null},
		Project:             pgtype.Varchar{Status: pgtype.Null},
		PstTicker:           pgtype.Varchar{Status: pgtype.Null},
		PstName:             pgtype.Varchar{Status: pgtype.Null},
		ContentType:         pgtype.Varchar{Status: pgtype.Null},
		BundlerContractTxId: pgtype.Varchar{Status: pgtype.Null},
		BundlerContractNode: pgtype.Varchar{Status: pgtype.Null},
		ContractTx:          pgtype.JSONB{Status: pgtype.Null},
		Testnet:             pgtype.Varchar{Status: pgtype.Null},
		DeploymentType:      pgtype.Varchar{Status: pgtype.Null},
		Manifest:            pgtype.JSONB{Status: pgtype.Null},
		SyncTimestamp:       pgtype.Int8{Status: pgtype.Null},
	}
}
