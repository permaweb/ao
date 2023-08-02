package main

import (
	"encoding/json"
	"github.com/everFinance/arsyncer"
	"github.com/everFinance/goar/types"
	"github.com/everFinance/goar/utils"
	"github.com/redstone-finance/redstone-sw-gateway/syncer/db"
	"github.com/redstone-finance/redstone-sw-gateway/syncer/sw_types"
	"os"
	"strconv"
)

var log = arsyncer.NewLog("syncer")

func main() {
	propertiesPath := os.Args[1]
	props, err := db.ReadPropertiesFile(propertiesPath)
	if err != nil {
		log.Error("Cannot read properties file", err)
		return
	}

	port, err := strconv.Atoi(props["DB_PORT"])
	if err != nil {
		log.Error("Cannot parse db port", err)
		return
	}

	db := db.New(db.ConnectionParams{
		Host:     props["DB_HOST"],
		Port:     port,
		User:     props["DB_USER"],
		Password: props["DB_PASSWORD"],
		Dbname:   props["DB_NAME"],
	})
	defer db.Close()

	startHeight := db.LoadLatestSyncedBlock()

	swcFilterParams := arsyncer.FilterParams{
		Tags: []types.Tag{
			{Name: "App-Name", Value: "SmartWeaveAction"},
		},
	}

	arNode := "https://arweave.net"
	concurrencyNumber := 50
	s := arsyncer.New(startHeight, swcFilterParams, arNode, concurrencyNumber, 15)
	s.Run()

	for {
		select {
		case sTx := <-s.SubscribeTxCh():
			interactions := make([]sw_types.DbInteraction, 0)
			var highestBlockHeight int64 = 0
			for _, tx := range sTx {
				decodedTags, _ := utils.TagsDecode(tx.Tags)
				var contract, input, function = "", "", ""
				for _, t := range decodedTags {
					if t.Name == "Contract" {
						contract = t.Value
					}
					if t.Name == "Input" {
						input = t.Value
						var parsedInput map[string]interface{}
						err := json.Unmarshal([]byte(input), &parsedInput)
						if err != nil {
							log.Error("Cannot parse function in input", input)
						}
						if val, ok := parsedInput["function"]; ok {
							function = val.(string)
						}
					}

					if contract != "" && input != "" {
						break
					}
				}

				swInteraction := sw_types.SwInteraction{
					Id: tx.ID,
					Owner: sw_types.SwOwner{
						Address: tx.Owner,
					},
					Recipient: tx.Target,
					Tags:      decodedTags,
					Block: sw_types.SwBlock{
						Height:    tx.BlockHeight,
						Id:        tx.BlockId,
						Timestamp: tx.BlockTimestamp,
					},
					Fee: sw_types.Amount{
						Winston: tx.Reward,
					},
					Quantity: sw_types.Amount{
						Winston: tx.Quantity,
					},
				}

				swInteractionJson, err := json.Marshal(swInteraction)
				if err != nil {
					log.Error("Error while marshalling interaction", err)
					panic(err)
				}
				log.Debug("Interaction:", string(swInteractionJson))
				highestBlockHeight = tx.BlockHeight

				interactions = append(interactions, sw_types.DbInteraction{
					InteractionId:      tx.ID,
					Interaction:        string(swInteractionJson),
					BlockHeight:        tx.BlockHeight,
					BlockId:            tx.BlockId,
					ContractId:         contract,
					Function:           function,
					Input:              input,
					ConfirmationStatus: "not_processed",
				})
			}

			err := db.BatchInsertInteractions(interactions)
			if err == nil && highestBlockHeight != 0 {
				log.Info("Updating last processed block height to ", highestBlockHeight)
				db.UpdateLastProcessedInteractionHeight(highestBlockHeight)
			}
		}
	}
}
