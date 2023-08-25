package cmd

import (
	"github.com/warp-contracts/syncer/src/gateway"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(gatewayCmd)
}

var gatewayCmd = &cobra.Command{
	Use:   "gateway",
	Short: "Serves various info from the database",
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		controller, err := gateway.NewController(conf)
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
		log.Debug("Finished gateway command")
		applicationCtxCancel()
		return
	},
}
