package warp

import (
	"fmt"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/smartweave"
)

type Validator func(arweave.Base64String) error

func min(min int) Validator {
	return func(v arweave.Base64String) error {
		if len(v) < min {
			return fmt.Errorf("tag length less than min %d ", min)
		}
		return nil
	}
}

func max(max int) Validator {
	return func(v arweave.Base64String) error {
		if len(v) > max {
			return fmt.Errorf("tag length greater than max %d ", max)
		}
		return nil
	}
}

var validators = map[string][]Validator{
	TagSequencer:                  {min(0), max(10000)},
	TagSequencerOwner:             {min(0), max(10000)},
	TagSequencerMillis:            {min(0), max(10000)},
	TagSequencerSortKey:           {min(0), max(10000)},
	TagSequencerLastSortKey:       {min(0), max(10000)},
	TagSequencerTxId:              {min(0), max(10000)},
	TagSequencerBlockHeight:       {min(0), max(10000)},
	TagSequencerBlockId:           {min(0), max(10000)},
	TagSequencerBlockTimestamp:    {min(0), max(10000)},
	TagSequencerNonce:             {min(0), max(10000)},
	TagInitState:                  {min(1), max(10000)},
	TagInitStateTx:                {min(0), max(10000)},
	TagInteractWrite:              {min(0), max(10000)},
	TagWasmLang:                   {min(0), max(10000)},
	TagWasmLangVersion:            {min(0), max(10000)},
	TagWasmMeta:                   {min(0), max(10000)},
	TagRequestVrf:                 {min(0), max(10000)},
	TagSignatureType:              {min(0), max(10000)},
	TagWarpTestnet:                {min(0), max(10000)},
	TagManifest:                   {min(0), max(10000)},
	TagNonce:                      {min(0), max(10000)},
	smartweave.TagAppName:         {min(0), max(10000)},
	smartweave.TagAppVersion:      {min(0), max(10000)},
	smartweave.TagContractTxId:    {min(0), max(10000)},
	smartweave.TagInput:           {min(0), max(10000)},
	smartweave.TagContentType:     {min(0), max(10000)},
	smartweave.TagContractSrcTxId: {min(0), max(10000)},
	smartweave.TagSDK:             {min(0), max(10000)},
	smartweave.TagMinFee:          {min(0), max(10000)},
}

func ValidateTag(tag *arweave.Tag) (err error) {
	tagValidators, ok := validators[string(tag.Name)]
	if !ok {
		// Unknown tag, skip validation
		return
	}
	for _, validator := range tagValidators {
		err = validator(tag.Value)
		if err != nil {
			// Doesn't validate
			return
		}
	}

	return
}
