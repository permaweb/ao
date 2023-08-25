package middleware

import (
	"net/http"
	"net/http/httputil"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	. "github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func HandleLogging(config *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		t := time.Now()
		c.Set("st", t)

		path := c.Request.URL.Path
		method := c.Request.Method

		if config.IsDevelopment {
			req, err := httputil.DumpRequest(c.Request, true /* don't dump the body */)
			if err != nil {
				LOGE(c, err, http.StatusInternalServerError).Error("Failed to dump request")
			}
			LOG(c).WithFields(logrus.Fields{"met": method, "path": path, "req": string(req)}).Warn("Starting handling request")
		} else {
			LOG(c).WithFields(logrus.Fields{"met": method, "path": path}).Info("Starting handling request")
		}

		c.Next()

		latency := time.Since(t)
		status := c.Writer.Status()

		switch {
		case status >= 200 && status < 400:
			LOG(c).WithFields(logrus.Fields{"met": method, "status": status, "latency": latency}).Debug(path)
			return
		case status >= 400 && status < 500:
			LOG(c).WithFields(logrus.Fields{"met": method, "status": status, "latency": latency}).Warn(path)
		default:
			comment := c.Errors.ByType(gin.ErrorTypePrivate).String()
			LOG(c).WithFields(logrus.Fields{"met": method, "status": status, "latency": latency, "comment": comment}).Warn(path)
		}
	}
}
