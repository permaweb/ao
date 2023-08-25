package sync

import (
	"sync"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/listener"
	"github.com/warp-contracts/syncer/src/utils/model"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"
	"github.com/warp-contracts/syncer/src/utils/warp"
)

// Gets contract's source and init state
type Parser struct {
	*task.Task

	monitor           monitoring.Monitor
	interactionParser *warp.InteractionParser

	input  chan *listener.Payload
	Output chan *Payload
}

// Converts Arweave transactions into Warp's contracts
func NewParser(config *config.Config) (self *Parser) {
	self = new(Parser)

	self.Output = make(chan *Payload)

	self.Task = task.NewTask(config, "parser").
		WithSubtaskFunc(self.run).
		WithWorkerPool(10, 1000).
		WithOnAfterStop(func() {
			close(self.Output)
		}).
		WithOnBeforeStart(func() error {
			// Converting Arweave transactions to interactions
			var err error
			self.interactionParser, err = warp.NewInteractionParser(config)
			return err
		})

	return
}

func (self *Parser) WithMonitor(monitor monitoring.Monitor) *Parser {
	self.monitor = monitor
	return self
}

func (self *Parser) WithInputChannel(v chan *listener.Payload) *Parser {
	self.input = v
	return self
}

func (self *Parser) run() error {
	// Each payload has a slice of transactions
	for payload := range self.input {

		interactions, err := self.parseAll(payload)
		if err != nil {
			return err
		}

		self.Log.WithField("height", payload.BlockHeight).WithField("len", len(interactions)).Debug("Parsed interactions")
		select {
		case <-self.Ctx.Done():
			return nil
		case self.Output <- &Payload{
			BlockHeight:    uint64(payload.BlockHeight),
			BlockHash:      payload.BlockHash,
			BlockTimestamp: uint64(payload.BlockTimestamp),
			Interactions:   interactions,
		}:
		}
	}

	return nil
}

func (self *Parser) parseAll(payload *listener.Payload) (out []*model.Interaction, err error) {
	if len(payload.Transactions) == 0 {
		// Skip empty blocks
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(payload.Transactions))
	var mtx sync.Mutex

	// Fill int
	out = make([]*model.Interaction, 0, len(payload.Transactions))
	for _, tx := range payload.Transactions {
		tx := tx
		self.SubmitToWorker(func() {
			// Parse transactions into interaction
			interaction, err := self.interactionParser.Parse(tx, payload.BlockHeight, payload.BlockHash, payload.BlockTimestamp)
			if err != nil {
				self.monitor.GetReport().Syncer.State.FailedInteractionParsing.Inc()
				self.Log.WithField("tx_id", tx.ID).Warn("Failed to parse interaction from tx, neglecting")
				goto done
			}

			mtx.Lock()
			out = append(out, interaction)
			mtx.Unlock()

		done:
			wg.Done()
		})
	}

	wg.Wait()
	return
}
