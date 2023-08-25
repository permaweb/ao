package cmd

import (
	"github.com/warp-contracts/syncer/src/bundle"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(bundleCmd)
}

var bundleCmd = &cobra.Command{
	Use:   "bundle",
	Short: "Download new interactions and bundle them together in Arweave",
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		controller, err := bundle.NewController(conf)
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
		log.Debug("Finished bundle command")
		applicationCtxCancel()
		return
	},
}
