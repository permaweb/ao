package load

import (
	"encoding/json"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/task"
	"github.com/warp-contracts/syncer/src/utils/warp"
)

// Generates fake transactions
type Parser struct {
	*task.Task

	interactionParser *warp.InteractionParser
	blockDownloader   *BlockDownloader

	input  chan *arweave.Transaction
	Output chan *Payload
}

func NewParser(config *config.Config) (self *Parser) {
	self = new(Parser)

	var err error
	self.interactionParser, err = warp.NewInteractionParser(config)
	if err != nil {
		self.Log.Panic("Failed to initialize parser")
	}

	self.Output = make(chan *Payload)

	self.Task = task.NewTask(config, "Parser").
		WithSubtaskFunc(self.run)

	return
}

func (self *Parser) WithBlockDownloader(v *BlockDownloader) *Parser {
	self.blockDownloader = v
	return self
}

func (self *Parser) WithInputChannel(v chan *arweave.Transaction) *Parser {
	self.input = v
	return self
}

func (self *Parser) run() (err error) {
	var (
		interaction *model.Interaction
		txJSON      []byte
		tagsJSON    []byte
	)

	for tx := range self.input {
		// self.Log.Info("Parsing tx")

		block := self.blockDownloader.GetNewestBlock()

		interaction, err = self.interactionParser.Parse(tx, block.Height, block.Hash, block.Timestamp)
		if err != nil {
			self.Log.WithField("tx_id", tx.ID).Warn("Failed to parse transaction")
			return
		}
		interaction.Source = "bundler-load-tests"

		var bundleItem model.BundleItem
		bundleItem.State = model.BundleStatePending

		// Tags
		tagsJSON, err = json.Marshal(tx.Tags)
		if err != nil {
			self.Log.WithError(err).Error("Failed to marshal tags")
			return
		}

		err = bundleItem.Tags.UnmarshalJSON(tagsJSON)
		if err != nil {
			self.Log.WithError(err).Error("Failed to unmarshal tags")
			return
		}

		// Transaction
		txJSON, err = json.Marshal(tx)
		if err != nil {
			self.Log.WithError(err).Error("Failed to marshal tags")
			return
		}

		err = bundleItem.Transaction.UnmarshalJSON(txJSON)
		if err != nil {
			self.Log.WithError(err).Error("Failed to unmarshal tags")
			return
		}

		select {
		case <-self.Ctx.Done():
			return
		case self.Output <- &Payload{
			Interaction: interaction,
			BundleItem:  &bundleItem,
		}:
		}
	}
	return
}
