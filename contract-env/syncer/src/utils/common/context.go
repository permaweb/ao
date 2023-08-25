package common

import (
	"context"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/logger"
)

var log = logger.NewSublogger("context")

func SetConfig(ctx context.Context, config *config.Config) context.Context {
	return context.WithValue(ctx, contextConfig, config)
}

func GetConfig(ctx context.Context) *config.Config {
	config, ok := ctx.Value(contextConfig).(*config.Config)
	if !ok {
		log.WithField("key", contextConfig).Panic("Failed to get config from context")
	}
	return config
}
