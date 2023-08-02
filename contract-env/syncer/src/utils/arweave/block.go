package arweave

import (
	"bytes"
	"crypto/sha256"
	"crypto/sha512"
	"fmt"
	"reflect"
)

const (
	HEIGHT_2_5 = int64(812970)
	HEIGHT_2_6 = int64(1132210)
)

type Block struct {
	Nonce                    Base64String   `json:"nonce"`
	PreviousBlock            Base64String   `json:"previous_block"`
	Timestamp                int64          `json:"timestamp"`
	LastRetarget             int64          `json:"last_retarget"`
	Diff                     BigInt         `json:"diff"`
	Height                   int64          `json:"height"`
	Hash                     Base64String   `json:"hash"`
	IndepHash                Base64String   `json:"indep_hash"`
	Txs                      []Base64String `json:"txs"`
	TxRoot                   Base64String   `json:"tx_root"`
	TxTree                   interface{}    `json:"tx_tree"`
	HashList                 interface{}    `json:"hash_list"`
	HashListMerkle           Base64String   `json:"hash_list_merkle"`
	WalletList               Base64String   `json:"wallet_list"`
	RewardAddr               RewardAddr     `json:"reward_addr"`
	Tags                     []interface{}  `json:"tags"`
	RewardPool               BigInt         `json:"reward_pool"`
	WeaveSize                BigInt         `json:"weave_size"`
	BlockSize                BigInt         `json:"block_size"`
	CumulativeDiff           BigInt         `json:"cumulative_diff"`
	SizeTaggedTxs            interface{}    `json:"size_tagged_txs"`
	Poa                      POA            `json:"poa"`
	UsdToArRate              []BigInt       `json:"usd_to_ar_rate"`
	ScheduledUsdToArRate     []BigInt       `json:"scheduled_usd_to_ar_rate"`
	Packing25Threshold       BigInt         `json:"packing_2_5_threshold"`
	StrictDataSplitThreshold BigInt         `json:"strict_data_split_threshold"`

	// Fields added in v2.6
	HashPreimage                  Base64String       `json:"hash_preimage"`
	RecallByte                    BigInt             `json:"recall_byte"`
	Reward                        BigInt             `json:"reward"`
	PreviousSolutionHash          Base64String       `json:"previous_solution_hash"`
	PartitionNumber               uint64             `json:"partition_number"`
	NonceLimiterInfo              NonceLimiterInfo   `json:"nonce_limiter_info"`
	POA2                          POA                `json:"poa2"`
	RecallByte2                   BigInt             `json:"recall_byte2"`
	Signature                     Base64String       `json:"signature"`
	RewardKey                     Base64String       `json:"reward_key"`
	PricePerGibMinute             BigInt             `json:"price_per_gib_minute"`
	ScheduledPricePerGibMinute    BigInt             `json:"scheduled_price_per_gib_minute"`
	RewardHistoryHash             Base64String       `json:"reward_history_hash"`
	DebtSupply                    BigInt             `json:"debt_supply"`
	KryderPlusRateMultiplier      BigInt             `json:"kryder_plus_rate_multiplier"`
	KryderPlusRateMultiplierLatch BigInt             `json:"kryder_plus_rate_multiplier_latch"`
	Denomination                  BigInt             `json:"denomination"`
	RedenominationHeight          uint64             `json:"redenomination_height"`
	DoubleSigningProof            DoubleSigningProof `json:"double_signing_proof"`
	PreviousCumulativeDiff        BigInt             `json:"previous_cumulative_diff"`
}

type POA struct {
	Option   string       `json:"option"`
	TxPath   Base64String `json:"tx_path"`
	DataPath Base64String `json:"data_path"`
	Chunk    Base64String `json:"chunk"`
}

type NonceLimiterInfo struct {
	Output              Base64String   `json:"output"`
	GlobalStepNumber    uint64         `json:"global_step_number"`
	Seed                Base64String   `json:"seed"`
	NextSeed            Base64String   `json:"next_seed"`
	ZoneUpperBound      uint64         `json:"zone_upper_bound"`
	NextZoneUpperBound  uint64         `json:"next_zone_upper_bound"`
	PrevOutput          Base64String   `json:"prev_output"`
	LastStepCheckpoints []Base64String `json:"last_step_checkpoints"`
	Checkpoints         []Base64String `json:"checkpoints"`
}

type DoubleSigningProof struct {
	Key                     Base64String `json:"pub_key"`
	Sig1                    Base64String `json:"sig1"`
	CumulativeDiff1         BigInt       `json:"cdiff1"`
	PreviousCumulativeDiff1 BigInt       `json:"prev_cdiff1"`
	Preimage1               Base64String `json:"preimage1"`
	Sig2                    Base64String `json:"sig2"`
	CumulativeDiff2         BigInt       `json:"cdiff2"`
	PreviousCumulativeDiff2 BigInt       `json:"prev_cdiff2"`
	Preimage2               Base64String `json:"preimage2"`
}

func (d DoubleSigningProof) Bytes() []byte {
	if reflect.ValueOf(d).IsZero() {
		return []byte{byte(0)}
	}

	buf := Encoder{Buffer: bytes.NewBuffer(nil)}
	buf.RawWrite(byte(1))
	buf.RawWriteSize(d.Key, 64)
	buf.RawWriteSize(d.Sig1, 64)
	buf.Write(d.CumulativeDiff1, 2)
	buf.Write(d.PreviousCumulativeDiff1, 2)
	buf.RawWriteSize(d.Preimage1, 8)
	buf.RawWriteSize(d.Sig2, 64)
	buf.Write(d.CumulativeDiff2, 2)
	buf.Write(d.PreviousCumulativeDiff2, 2)
	buf.RawWriteSize(d.Preimage2, 8)

	return buf.Bytes()
}

func (b *Block) IsValid() bool {
	if b.Height < HEIGHT_2_5 {
		return false
	} else if b.Height < HEIGHT_2_6 {
		return b.IsValid_2_5()
	} else {
		return b.IsValid_2_6()
	}
}

func (b *Block) IsValid_2_6() bool {
	buf := Encoder{Buffer: bytes.NewBuffer(nil)}

	buf.Write(b.PreviousBlock, 1)
	buf.Write(b.Timestamp, 1)
	buf.Write(b.Nonce, 2)
	buf.Write(b.Height, 1)
	buf.Write(b.Diff, 2)
	buf.Write(b.CumulativeDiff, 2)
	buf.Write(b.LastRetarget, 1)
	buf.Write(b.Hash, 1)
	buf.Write(b.BlockSize, 2)
	buf.Write(b.WeaveSize, 2)
	buf.Write(b.RewardAddr, 1)
	buf.Write(b.TxRoot, 1)
	buf.Write(b.WalletList, 1)
	buf.Write(b.HashListMerkle, 1)
	buf.Write(b.RewardPool, 1)
	buf.Write(b.Packing25Threshold, 1)
	buf.Write(b.StrictDataSplitThreshold, 1)
	buf.Write(b.UsdToArRate[0], 1)
	buf.Write(b.UsdToArRate[1], 1)
	buf.Write(b.ScheduledUsdToArRate[0], 1)
	buf.Write(b.ScheduledUsdToArRate[1], 1)
	buf.WriteSlice(b.Tags, 2, 2)
	buf.WriteSlice(b.Txs, 2, 1)
	buf.Write(b.Reward, 1)
	buf.Write(b.RecallByte, 2)
	buf.Write(b.HashPreimage, 1)
	buf.Write(b.RecallByte2, 2)
	buf.Write(b.RewardKey, 2)
	buf.Write(b.PartitionNumber, 1)
	buf.RawWriteSize(b.NonceLimiterInfo.Output, 32)
	buf.RawWriteSize(b.NonceLimiterInfo.GlobalStepNumber, 8)
	buf.RawWriteSize(b.NonceLimiterInfo.Seed, 48)
	buf.RawWriteSize(b.NonceLimiterInfo.NextSeed, 48)
	buf.RawWriteSize(b.NonceLimiterInfo.ZoneUpperBound, 32)
	buf.RawWriteSize(b.NonceLimiterInfo.NextZoneUpperBound, 32)
	buf.Write(b.NonceLimiterInfo.PrevOutput, 1)
	buf.RawWriteSize(uint16(len(b.NonceLimiterInfo.Checkpoints)), 2)
	buf.RawWrite(b.NonceLimiterInfo.Checkpoints)
	buf.RawWriteSize(uint16(len(b.NonceLimiterInfo.LastStepCheckpoints)), 2)
	buf.RawWrite(b.NonceLimiterInfo.LastStepCheckpoints)
	buf.Write(b.PreviousSolutionHash, 1)
	buf.Write(b.PricePerGibMinute, 1)
	buf.Write(b.ScheduledPricePerGibMinute, 1)
	buf.RawWriteSize(b.RewardHistoryHash, 32)
	buf.Write(b.DebtSupply, 1)
	buf.RawWriteSize(b.KryderPlusRateMultiplier, 3)
	buf.RawWriteSize(b.KryderPlusRateMultiplierLatch, 1)
	buf.RawWriteSize(b.Denomination, 3)
	buf.Write(b.RedenominationHeight, 1)
	buf.RawWrite(b.DoubleSigningProof.Bytes())
	buf.Write(b.PreviousCumulativeDiff, 2)

	// "Signed hash"
	sha := sha256.New()
	sha.Write(buf.Bytes())
	signedHash := sha.Sum(nil)

	// indep_hash2
	hash := sha512.Sum384(append(signedHash[:], b.Signature.Bytes()[:]...))

	return bytes.Equal(hash[:], b.IndepHash)
}

func (b *Block) IsValid_2_5() bool {
	bds := generateBlockDataSegment(b)
	list := []any{
		bds,
		b.Hash,
		b.Nonce,
		[]interface{}{
			b.Poa.Option,
			b.Poa.TxPath,
			b.Poa.DataPath,
			b.Poa.Chunk,
		},
	}
	hash := DeepHash(list)

	return bytes.Equal(hash[:], b.IndepHash)
}

func generateBlockDataSegment(b *Block) []byte {
	bdsBase := generateBlockDataSegmentBase(b)

	values := []any{
		bdsBase,
		fmt.Sprintf("%d", b.Timestamp),
		fmt.Sprintf("%d", b.LastRetarget),
		b.Diff.String(),
		b.CumulativeDiff.String(),
		b.RewardPool.String(),
		b.WalletList,
		b.HashListMerkle,
	}
	hash := DeepHash(values)
	return hash[:]
}

func generateBlockDataSegmentBase(b *Block) []byte {
	props := []any{
		b.UsdToArRate[0],          //RateDividend
		b.UsdToArRate[1],          //RateDivisor
		b.ScheduledUsdToArRate[0], //ScheduledRateDividend
		b.ScheduledUsdToArRate[1], //ScheduledRateDivisor
		b.Packing25Threshold,
		b.StrictDataSplitThreshold,
		fmt.Sprintf("%d", b.Height),
		b.PreviousBlock,
		b.TxRoot,
		b.Txs,
		b.BlockSize,
		b.WeaveSize,
		b.RewardAddr,
		b.Tags,
	}

	hash := DeepHash(props)
	return hash[:]
}
