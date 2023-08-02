package cmd

import (
	"github.com/warp-contracts/syncer/src/load"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(loadCmd)
}

var loadCmd = &cobra.Command{
	Use:   "load",
	Short: "Generates fake transactions and inserts them into the database. Used for testing bundler.",
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		controller, err := load.NewController(conf)
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
		log.Debug("Finished load command")
		applicationCtxCancel()
		return
	},
}
