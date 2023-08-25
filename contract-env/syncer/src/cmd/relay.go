package cmd

import (
	"github.com/warp-contracts/syncer/src/relay"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(relayCmd)
}

var relayCmd = &cobra.Command{
	Use:   "relay",
	Short: "Sends interactions from Warp's Sequencer to Arweave",
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		controller, err := relay.NewController(conf)
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
		log.Debug("Finished relay command")
		applicationCtxCancel()
		return
	},
}
