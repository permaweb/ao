package cmd

import (
	"github.com/warp-contracts/syncer/src/forward"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(forwardCmd)
}

var forwardCmd = &cobra.Command{
	Use:   "forward",
	Short: "Forwards interactions to Redis. This is the single point of joining L1 and L2 interactiopns.",
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		controller, err := forward.NewController(conf)
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
		log.Debug("Finished forward command")
		applicationCtxCancel()
		return
	},
}
