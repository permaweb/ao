package cmd

import (
	"github.com/warp-contracts/syncer/src/check"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(checkCmd)
}

var checkCmd = &cobra.Command{
	Use:   "check",
	Short: "Updates bundle status after it's in the FINALIZED state in bundlr.network",
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		controller, err := check.NewController(conf)
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
		log.Debug("Finished check command")
		applicationCtxCancel()
		return
	},
}
