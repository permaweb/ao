package model

import "github.com/jackc/pgtype"

const TableContractSource = "contracts_src"

type ContractSource struct {
	SrcTxId         string
	Src             pgtype.Text
	SrcContentType  pgtype.Varchar
	SrcBinary       pgtype.Bytea
	SrcWasmLang     pgtype.Varchar
	BundlerSrcTxId  pgtype.Varchar
	BundlerSrcNode  pgtype.Varchar
	SrcTx           pgtype.JSONB
	Owner           pgtype.Varchar
	Testnet         pgtype.Text
	BundlerResponse pgtype.Text
	DeploymentType  pgtype.Varchar
}

func NewContractSource() *ContractSource {
	return &ContractSource{
		Src:             pgtype.Text{Status: pgtype.Null},
		SrcContentType:  pgtype.Varchar{Status: pgtype.Null},
		SrcBinary:       pgtype.Bytea{Status: pgtype.Null},
		SrcWasmLang:     pgtype.Varchar{Status: pgtype.Null},
		BundlerSrcTxId:  pgtype.Varchar{Status: pgtype.Null},
		BundlerSrcNode:  pgtype.Varchar{Status: pgtype.Null},
		SrcTx:           pgtype.JSONB{Status: pgtype.Null},
		Owner:           pgtype.Varchar{Status: pgtype.Null},
		Testnet:         pgtype.Text{Status: pgtype.Null},
		BundlerResponse: pgtype.Text{Status: pgtype.Null},
		DeploymentType:  pgtype.Varchar{Status: pgtype.Null},
	}
}

func (ContractSource) TableName() string {
	return TableContractSource
}

func (self *ContractSource) IsJS() bool {
	return self.SrcContentType.String == "application/javascript"
}
