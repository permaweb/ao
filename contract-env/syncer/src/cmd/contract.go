package cmd

import (
	"github.com/warp-contracts/syncer/src/contract"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	contractCmd.PersistentFlags().Uint64Var(&startBlockHeight, "start", 0, "Start block height")
	contractCmd.PersistentFlags().Uint64Var(&stopBlockHeight, "stop", 0, "Stop block height")
	contractCmd.PersistentFlags().BoolVar(&replaceExistingData, "DANGEROUS_replace_existing_data", false, "Replace data that is already in the database. Default: false")
	RootCmd.AddCommand(contractCmd)
}

var (
	startBlockHeight    uint64
	stopBlockHeight     uint64
	replaceExistingData bool

	contractCmd = &cobra.Command{
		Use:   "contract",
		Short: "Synchronizes contracts from L1. Src and init state as well",
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			controller, err := contract.NewController(conf, startBlockHeight, stopBlockHeight, replaceExistingData)
			if err != nil {
				return
			}

			err = controller.Start()
			if err != nil {
				return
			}

			select {
			case <-controller.CtxRunning.Done():
			case <-applicationCtx.Done():
			}

			controller.StopWait()

			return
		},
		PostRunE: func(cmd *cobra.Command, args []string) (err error) {
			log := logger.NewSublogger("root-cmd")
			log.Debug("Finished contract command")
			applicationCtxCancel()
			return
		},
	}
)
