package middleware

import (
	utils "github.com/warp-contracts/syncer/src/utils/context"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/gin-gonic/gin"
	"github.com/rs/xid"
	"github.com/sirupsen/logrus"
)

// Adds request id to logs, fills in logger
func HandleRequestId() gin.HandlerFunc {
	return func(c *gin.Context) {
		// self.log.Debug("JWT Request ID Start")
		// defer self.log.Debug("JWT Request ID End")

		fields := logrus.Fields{}
		id := c.Request.Header.Get("X-Request-ID")
		if id != "" {
			fields["rid"] = id
		} else {
			// There was no header with the request id
			// Generate the id
			id = xid.New().String()
			fields["rid"] = id
		}
		utils.SetRequestID(c, id)
		logger.SetupLogger(c, fields)
		c.Next()
	}
}
