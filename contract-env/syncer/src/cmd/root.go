package cmd

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/warp-contracts/syncer/src/utils/common"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/spf13/cobra"
)

var (
	RootCmd = &cobra.Command{
		Use:   "syncer",
		Short: "Tool listening for changes from Arweave nodes",

		// All child commands will use this
		PersistentPreRunE: func(cmd *cobra.Command, args []string) (err error) {
			// Setup a context that gets cancelled upon SIGINT
			applicationCtx, applicationCtxCancel = context.WithCancel(context.Background())

			signalChannel = make(chan os.Signal, 1)
			signal.Notify(signalChannel, os.Interrupt, syscall.SIGTERM)

			// Load configuration
			conf, err = config.Load(cfgFile)
			if err != nil {
				return
			}
			applicationCtx = common.SetConfig(applicationCtx, conf)

			go func() {
				select {
				case <-signalChannel:
					applicationCtxCancel()
				case <-applicationCtx.Done():
				}
			}()

			// Setup logging
			err = logger.Init(conf)
			if err != nil {
				return
			}

			// FIXME: Log configuration

			return
		},

		// Run after all commands
		PersistentPostRunE: func(cmd *cobra.Command, args []string) (err error) {
			defer func() {
				signal.Stop(signalChannel)
				applicationCtxCancel()
			}()
			// log := logger.NewSublogger("root-cmd")
			<-applicationCtx.Done()
			// log.Debug("Finished")
			return
		},

		// FIXME: Check if true
		// SilenceErrors: true,
	}

	// Configuration
	conf    *config.Config
	cfgFile string

	// Application context.
	// As soon as application ctx gets canceled the app stars to shutdown
	// It shuts down gracefully, finishes processing within a predefined timeout
	applicationCtx       context.Context
	applicationCtxCancel context.CancelFunc

	// Signals from the OS
	signalChannel chan os.Signal
)

func init() {
	RootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "configuration file path")
}
