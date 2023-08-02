package monitoring

import (
	"github.com/warp-contracts/syncer/src/utils/monitoring/report"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

// Stores and computes monitor counters
type Monitor interface {
	IsOK() bool
	OnGetState(c *gin.Context)
	OnGetHealth(c *gin.Context)
	GetPrometheusCollector() (collector prometheus.Collector)
	GetReport() *report.Report
	SetPermanentError(err error)
	Clear()
}
