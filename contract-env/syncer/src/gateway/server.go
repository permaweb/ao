package gateway

import (
	"context"
	"net/http"

	"github.com/sirupsen/logrus"
	"github.com/warp-contracts/syncer/src/utils/build_info"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/middleware"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

// Rest API server, serves monitor counters
type Server struct {
	*task.Task

	httpServer *http.Server
	Router     *gin.Engine
	monitor    monitoring.Monitor
	db         *gorm.DB
}

func NewServer(config *config.Config) (self *Server) {
	self = new(Server)

	self.Task = task.NewTask(config, "rest-server").
		WithSubtaskFunc(self.run).
		WithOnStop(self.stop)

	self.Router = gin.New()
	self.Router.Use(
		gin.RecoveryWithWriter(self.Log.WriterLevel(logrus.ErrorLevel)),
		middleware.HandleRequestId(),
		middleware.HandleErrors(),
		middleware.HandleTimeout(config.Gateway.ServerRequestTimeout),
		middleware.HandleLogging(config),
	)
	self.httpServer = &http.Server{
		Addr:    config.Gateway.ServerListenAddress,
		Handler: self.Router,
	}

	v1 := self.Router.Group("v1")
	{
		v1.POST("interactions", self.onGetInteractions)
		v1.GET("version", self.onVersion)
	}

	return
}

func (self *Server) WithMonitor(m monitoring.Monitor) *Server {
	self.monitor = m
	return self
}

func (self *Server) WithDB(v *gorm.DB) *Server {
	self.db = v
	return self
}

func (self *Server) run() (err error) {
	err = self.httpServer.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		self.Log.WithError(err).Error("Failed to start REST server")
		return
	}
	return nil
}

func (self *Server) onVersion(c *gin.Context) {
	c.JSON(http.StatusOK, map[string]string{
		"version":    build_info.Version,
		"build_date": build_info.BuildDate,
	})
}

func (self *Server) stop() {
	ctx, cancel := context.WithTimeout(context.Background(), self.Config.StopTimeout)
	defer cancel()

	err := self.httpServer.Shutdown(ctx)
	if err != nil {
		self.Log.WithError(err).Error("Failed to gracefully shutdown REST server")
		return
	}
}
