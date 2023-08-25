package monitoring

import (
	"context"
	"net/http"

	"github.com/warp-contracts/syncer/src/utils/build_info"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Rest API server, serves monitor counters
type Server struct {
	*task.Task

	registry   *prometheus.Registry
	httpServer *http.Server
	Router     *gin.Engine

	monitor Monitor
}

func NewServer(config *config.Config) (self *Server) {
	self = new(Server)

	self.Task = task.NewTask(config, "rest-server").
		WithSubtaskFunc(self.run).
		WithOnStop(self.stop)

	self.Router = gin.New()

	self.httpServer = &http.Server{
		Addr:    self.Config.RESTListenAddress,
		Handler: self.Router,
	}

	self.registry = prometheus.NewRegistry()
	self.registry.MustRegister(collectors.NewGoCollector())

	return
}

func (self *Server) WithMonitor(m Monitor) *Server {
	self.monitor = m
	self.registry.MustRegister(m.GetPrometheusCollector())
	return self
}

func (self *Server) run() (err error) {
	gin.SetMode(gin.ReleaseMode)

	v1 := self.Router.Group("v1")
	{
		v1.GET("state", self.monitor.OnGetState)
		v1.GET("health", self.monitor.OnGetHealth)
		v1.GET("monitor", self.handle())
		v1.GET("version", self.onVersion)
	}

	err = self.httpServer.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		self.Log.WithError(err).Error("Failed to start REST server")
		return
	}
	return nil
}

func (self *Server) handle() gin.HandlerFunc {
	h := promhttp.HandlerFor(self.registry, promhttp.HandlerOpts{})

	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
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
